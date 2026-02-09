-- Migration: Fix Completion Logic for v5 and v4 functions
-- Restores is_completed flag and synchronization with profiles.books_read_count

-- 1. Update update_reading_progress_v5 to handle is_completed
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
    v_was_completed boolean;
    v_is_now_completed boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Check current status
    SELECT is_completed INTO v_was_completed
    FROM public.user_progress
    WHERE user_id = v_user_id AND book_id = p_book_id;

    v_is_now_completed := (COALESCE(v_was_completed, false) OR (p_percentage >= 100));

    -- Upsert Progress
    INSERT INTO public.user_progress (
        user_id, book_id, progress_percentage, current_location, last_read_at, is_completed
    ) VALUES (
        v_user_id, p_book_id, p_percentage, p_location, now(), v_is_now_completed
    )
    ON CONFLICT (user_id, book_id) DO UPDATE SET 
        progress_percentage = GREATEST(user_progress.progress_percentage, EXCLUDED.progress_percentage),
        current_location = EXCLUDED.current_location,
        last_read_at = now(),
        is_completed = (user_progress.is_completed OR EXCLUDED.is_completed);

    -- Awarding logic if it was JUST completed
    IF v_is_now_completed AND COALESCE(v_was_completed, false) = false THEN
        -- award_xp is defined in gamification_functions.sql
        PERFORM public.award_xp(v_user_id, 50);
        
        -- Recalculate authoritative count (Heal sync)
        UPDATE public.profiles p
        SET books_read_count = (
            SELECT count(*) 
            FROM public.user_progress 
            WHERE user_id = v_user_id AND is_completed = true
        )
        WHERE id = v_user_id;
    END IF;

    SELECT xp, level INTO v_current_xp, v_current_level FROM profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'success', true,
        'xp', COALESCE(v_current_xp, 0),
        'level', COALESCE(v_current_level, 1),
        'leveled_up', (v_is_now_completed AND COALESCE(v_was_completed, false) = false),
        'message', CASE WHEN (v_is_now_completed AND COALESCE(v_was_completed, false) = false) THEN 'Book Completed! +50 XP' ELSE 'Progress saved' END
    );
END;
$$;

-- 2. Data Repair: Mark all 100% progress rows as is_completed = true
UPDATE public.user_progress
SET is_completed = true
WHERE progress_percentage >= 100 AND (is_completed = false OR is_completed IS NULL);

-- 3. One-time Sync for profiles.books_read_count
DO $$
DECLARE
    r RECORD;
    v_actual_count int;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        SELECT count(*) INTO v_actual_count
        FROM user_progress
        WHERE user_id = r.id AND is_completed = true;

        UPDATE profiles
        SET books_read_count = v_actual_count
        WHERE id = r.id;
    END LOOP;
END $$;
