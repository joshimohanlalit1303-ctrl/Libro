-- 1. Fix Book Count Discrepancy
-- Use a robust recount instead of incremental update
CREATE OR REPLACE FUNCTION on_book_complete()
RETURNS trigger AS $$
DECLARE
    v_count int;
    v_page_count int;
    v_started_at timestamptz;
BEGIN
    -- Check if is_completed changed to true
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        
        -- Anti-Cheat: Check reading duration (10 minutes)
        -- Only check if started_at is present (for backward compatibility)
        IF NEW.started_at IS NOT NULL THEN
             IF (now() - NEW.started_at) < interval '10 minutes' THEN
                 RAISE EXCEPTION 'You are reading too fast! Take at least 10 minutes to finish this book.';
             END IF;
        END IF;

        -- 1. Award XP (50 XP per book)
        PERFORM award_xp(NEW.user_id, 50);

        -- 2. Recalculate books_read_count (Self-Healing)
        SELECT count(*) INTO v_count
        FROM user_progress
        WHERE user_id = NEW.user_id AND is_completed = true;
        
        UPDATE profiles 
        SET books_read_count = v_count
        WHERE id = NEW.user_id;

        -- 3. Check Achievements
        PERFORM check_achievements(NEW.user_id);
    END IF;
    
    -- If unmarking completion, also heal the count
    IF NEW.is_completed = false AND OLD.is_completed = true THEN
         SELECT count(*) INTO v_count
        FROM user_progress
        WHERE user_id = NEW.user_id AND is_completed = true;
        
        UPDATE profiles 
        SET books_read_count = v_count
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Add started_at column to user_progress
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();

-- 3. One-time fix for all existing users
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
