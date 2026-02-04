-- 1. Add column to track active reading time per book
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS time_read_seconds bigint DEFAULT 0;

-- 2. New RPC to track time per book AND global time
CREATE OR REPLACE FUNCTION track_reading_time_v3(seconds int, book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Update Global Profile Time
  UPDATE profiles
  SET total_time_read = COALESCE(total_time_read, 0) + seconds,
      last_active_at = now()
  WHERE id = v_user_id;

  -- 2. Update Per-Book Time in user_progress
  -- We assume a row exists because Reader.tsx generally creates it on join/progress.
  -- But to be safe, we upsert if we have a valid book_id.
  IF book_id IS NOT NULL THEN
      INSERT INTO user_progress (user_id, book_id, time_read_seconds, last_read_at)
      VALUES (v_user_id, book_id, seconds, now())
      ON CONFLICT (user_id, book_id)
      DO UPDATE SET
          time_read_seconds = COALESCE(user_progress.time_read_seconds, 0) + EXCLUDED.time_read_seconds,
          last_read_at = now();
  END IF;
END;
$$;

-- 3. Update completion trigger to check time
CREATE OR REPLACE FUNCTION on_book_complete()
RETURNS trigger AS $$
DECLARE
    v_count int;
    v_time_read bigint;
BEGIN
    -- Check if is_completed changed to true
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        
        -- Anti-Cheat: Check reading duration (10 minutes = 600 seconds)
        -- We check existing row (OLD) or NEW if it was just updated?
        -- Triggers on UPDATE have access to NEW values.
        -- If time_read_seconds is NULL/0, checking started_at as fallback is okay for legacy,
        -- BUT user wants strict check now.
        
        v_time_read := COALESCE(NEW.time_read_seconds, 0);
        
        -- Strict Check: Must have > 600s logged
        IF v_time_read < 600 THEN
             -- Optionally fallback to started_at for old sessions if we want to be nice?
             -- User said "Make sure the book will not be counted as completed until he read it for atleast 10 minutes."
             -- Implies strictness.
             IF (now() - COALESCE(NEW.started_at, now())) < interval '10 minutes' THEN
                 RAISE EXCEPTION 'You are reading too fast! You need at least 10 minutes of active reading time.';
             END IF;
             
             -- If started_at says > 10m but time_read_seconds is 0 (legacy case), we might allow it?
             -- Let's be strict but allow started_at fallback for transition if time_read is 0.
             -- If time_read > 0 but < 600, it's definitely a fail.
             IF v_time_read > 0 AND v_time_read < 600 THEN
                 RAISE EXCEPTION 'Active reading time too low (%s). Please read for at least 10 minutes.', v_time_read || 's';
             END IF;
        END IF;

        -- 1. Award XP (50 XP per book)
        PERFORM award_xp(NEW.user_id, 50);

        -- 2. Recalculate books_read_count
        SELECT count(*) INTO v_count
        FROM user_progress
        WHERE user_id = NEW.user_id AND is_completed = true;
        
        UPDATE profiles 
        SET books_read_count = v_count
        WHERE id = NEW.user_id;

        -- 3. Check Achievements
        PERFORM check_achievements(NEW.user_id);
    END IF;
    
    -- If unmarking completion
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
