-- Migration: Fix Reading Location Sync
-- Defines version 5 of the progress tracking RPC to explicitly handle CFI locations

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
    v_message text := 'Progress saved';
BEGIN
    -- 1. Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Upsert Progress (The Critical Fix: Saving p_location)
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
        current_location = EXCLUDED.current_location, -- Always update location to where they are now
        last_read_at = now();

    -- 3. Check for Leveling/XP (Simplified for this fix)
    -- We'll return basic success status. The complex gamification logic
    -- can be triggered by triggers or handled separately if needed.
    -- For now, we reuse the existing profile data to just return current state.
    
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
