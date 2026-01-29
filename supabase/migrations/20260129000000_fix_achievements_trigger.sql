-- 1. Redefine check_achievements to be comprehensive and robust
-- drop first because we are changing return type from TABLE to VOID
DROP FUNCTION IF EXISTS public.check_achievements(uuid);

CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp bigint;
  v_streak int;
  v_books_read int;
  v_created_at timestamptz;
BEGIN
  -- Get user stats from profiles
  SELECT xp, streak_count, created_at INTO v_xp, v_streak, v_created_at
  FROM profiles
  WHERE id = p_user_id;

  -- Get books read count (authoritative from user_progress)
  -- Count only completed books
  SELECT count(*) INTO v_books_read
  FROM user_progress
  WHERE user_id = p_user_id AND is_completed = true;

  -------------------------
  -- 1. XP MILESTONES
  -------------------------
  -- "On The Path" (Level 2 / 100 XP)
  IF v_xp >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'getting-started'
    ON CONFLICT DO NOTHING;
  END IF;

  -------------------------
  -- 2. STREAK MILESTONES
  -------------------------
  -- "Consistent Reader" (3 Day Streak)
  IF v_streak >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'consistent-reader'
    ON CONFLICT DO NOTHING;
  END IF;

  -------------------------
  -- 3. BOOK MILESTONES
  -------------------------
  -- "Bookworm" (First Book)
  IF v_books_read >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'bookworm'
    ON CONFLICT DO NOTHING;
  END IF;

  -------------------------
  -- 4. SPECIAL BADGES
  -------------------------
  -- "Early Bird" (Joined strictly before June 1st, 2026)
  IF v_created_at < '2026-06-01'::timestamptz THEN
     INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'early-bird'
    ON CONFLICT DO NOTHING;
  END IF;

  -- "Social Butterfly" (Joined a room)
  -- We check the participants table for ANY record for this user
  IF EXISTS (SELECT 1 FROM participants WHERE user_id = p_user_id) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'social-butterfly'
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

-- 2. Create a Trigger Function for Profile Updates
CREATE OR REPLACE FUNCTION on_profile_update()
RETURNS trigger AS $$
BEGIN
    -- Only check if relevant stats changed to avoid infinite loops or waste
    IF (NEW.xp IS DISTINCT FROM OLD.xp) OR 
       (NEW.streak_count IS DISTINCT FROM OLD.streak_count) OR
       (NEW.level IS DISTINCT FROM OLD.level) THEN
       
        PERFORM check_achievements(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on Profiles
DROP TRIGGER IF EXISTS trigger_check_achievements ON profiles;

CREATE TRIGGER trigger_check_achievements
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION on_profile_update();

-- 4. BACKFILL: Run checks for ALL existing users immediately
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles LOOP
    PERFORM check_achievements(r.id);
  END LOOP;
END;
$$;
