-- 1. Insert missing badges into achievements table
INSERT INTO public.achievements (slug, name, description, xp_reward, icon_url)
VALUES 
    ('bookworm', 'Bookworm', 'Read your first book.', 50, 'BookOpen'),
    ('early-bird', 'Early Bird', 'Joined Libro in its early days.', 0, 'Sunrise')
ON CONFLICT (slug) DO UPDATE 
SET description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- 2. Update check_achievements function to include new logic
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id uuid)
RETURNS table (
  achievement_name text,
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp bigint;
  v_streak int;
  v_books_read int;
  v_created_at timestamptz;
  v_badge_slug text;
BEGIN
  -- Get user stats
  SELECT xp, streak_count, created_at INTO v_xp, v_streak, v_created_at
  FROM profiles
  WHERE id = p_user_id;

  -- Get books read count (authoritative from user_progress)
  -- We use count(*) from user_progress because profiles.books_read_count might be out of sync
  SELECT count(*) INTO v_books_read
  FROM user_progress
  WHERE user_id = p_user_id AND is_completed = true;

  -- 1. XP MILESTONES
  IF v_xp >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'getting-started'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. STREAK MILESTONES
  IF v_streak >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'consistent-reader'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. BOOKWORM (First Book)
  IF v_books_read >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'bookworm'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. EARLY BIRD (Joined before 2026-06-01)
  IF v_created_at < '2026-06-01'::timestamptz THEN
     INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'early-bird'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. SOCIAL BUTTERFLY (Joined a room)
  -- Check if user exists in participants table
  IF EXISTS (SELECT 1 FROM participants WHERE user_id = p_user_id) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'social-butterfly'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY 
  SELECT a.name, a.slug
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = p_user_id AND ua.unlocked_at > (now() - interval '1 minute');
END;
$$;

-- 3. Trigger to Auto-Award XP and Helper Function when Book Completed
CREATE OR REPLACE FUNCTION on_book_complete()
RETURNS trigger AS $$
BEGIN
    -- Check if is_completed changed to true
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        
        -- 1. Award XP (e.g., 50 XP per book)
        PERFORM award_xp(NEW.user_id, 50);

        -- 2. Increment profiles.books_read_count
        UPDATE profiles 
        SET books_read_count = COALESCE(books_read_count, 0) + 1 
        WHERE id = NEW.user_id;

        -- 3. Check Achievements (will catch Bookworm)
        PERFORM check_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid dupes
DROP TRIGGER IF EXISTS trigger_on_book_complete ON user_progress;

-- Create Trigger
CREATE TRIGGER trigger_on_book_complete
AFTER UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION on_book_complete();
