-- FIX: Run this to create the new progress tracking function
-- This ensures your reading location is saved correctly.

-- 1. Create the new v5 function
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
    v_new_xp bigint;
    v_current_level int;
    v_new_level int;
    v_leveled_up boolean := false;
BEGIN
    -- Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Upsert Progress with Location
    INSERT INTO public.user_progress (
        user_id, 
        book_id, 
        progress_percentage, 
        current_location, 
        last_read_at
    )
    VALUES (
        v_user_id, 
        p_book_id, 
        p_percentage, 
        p_location, 
        now()
    )
    ON CONFLICT (user_id, book_id) 
    DO UPDATE SET 
        progress_percentage = GREATEST(user_progress.progress_percentage, EXCLUDED.progress_percentage),
        current_location = EXCLUDED.current_location,
        last_read_at = now();

    -- Return Status (Simulated XP for now to keep frontend happy)
    SELECT xp, level INTO v_current_xp, v_current_level
    FROM profiles
    WHERE id = v_user_id;

    RETURN json_build_object(
        'success', true,
        'xp', COALESCE(v_current_xp, 0),
        'level', COALESCE(v_current_level, 1),
        'leveled_up', false,
        'message', 'Progress saved'
    );
END;
$$;
