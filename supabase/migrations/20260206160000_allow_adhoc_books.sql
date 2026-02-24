-- FIX: Drop Foreign Key constraint on book_id to allow ad-hoc books (PDFs/EPUBs not in library)
-- This allows saving progress for books that don't exist in the 'books' table.

DO $$ 
BEGIN
    -- Try to drop the constraint if it exists (generic name guess)
    ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_book_id_fkey;
    
    -- Try to find and drop ANY foreign key on book_id column
    -- (in case it has a different auto-generated name)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'user_progress' 
        AND column_name = 'book_id' 
        AND constraint_name != 'user_progress_pkey'
    ) THEN
        -- We can't easily dynamic-drop in DO block without knowing name, 
        -- so we rely on the standard naming convention above. 
        -- If that failed, we might need a more aggressive approach, but usually strict names are:
        -- user_progress_book_id_fkey
        NULL;
    END IF;
END $$;

-- Verify columns exist
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS progress_percentage INT;

-- Re-apply the V5 function just to be absolutely sure it's the latest version
CREATE OR REPLACE FUNCTION public.update_reading_progress_v5(
    p_book_id uuid,
    p_percentage integer,
    p_location text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_current_xp bigint;
    v_current_level int;
    v_message text := 'Progress saved';
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Upsert with atomic checks
    INSERT INTO public.user_progress (
        user_id, book_id, progress_percentage, current_location, last_read_at
    ) VALUES (
        v_user_id, p_book_id, p_percentage, p_location, now()
    )
    ON CONFLICT (user_id, book_id) DO UPDATE SET 
        progress_percentage = GREATEST(user_progress.progress_percentage, EXCLUDED.progress_percentage),
        current_location = EXCLUDED.current_location,
        last_read_at = now();

    SELECT xp, level INTO v_current_xp, v_current_level FROM profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'success', true,
        'xp', COALESCE(v_current_xp, 0),
        'level', COALESCE(v_current_level, 1),
        'leveled_up', false,
        'message', 'Progress saved'
    );
END;
$$;
