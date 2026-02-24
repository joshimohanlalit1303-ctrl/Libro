-- Fix Ambiguous Column Reference in check_achievements
-- Comprehensive Fix:
-- 1. Drop existing function to allow return type change.
-- 2. Rename output parameter to 'achievement_slug'.
-- 3. Qualify all column references with table aliases.

DROP FUNCTION IF EXISTS public.check_achievements(uuid);

CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id uuid)
RETURNS table (
  achievement_name text,
  achievement_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp bigint;
  v_streak int;
  v_books_read int;
  v_created_at timestamptz;
BEGIN
  -- Get user stats
  SELECT xp, streak_count, created_at INTO v_xp, v_streak, v_created_at
  FROM profiles
  WHERE id = p_user_id;

  -- Get books read count
  SELECT count(*) INTO v_books_read
  FROM user_progress
  WHERE user_id = p_user_id AND is_completed = true;

  -- 1. XP MILESTONES
  IF v_xp >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE achievements.slug = 'getting-started'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. STREAK MILESTONES
  IF v_streak >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE achievements.slug = 'consistent-reader'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. BOOKWORM (First Book)
  IF v_books_read >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE achievements.slug = 'bookworm'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. EARLY BIRD (Joined before 2026-06-01)
  IF v_created_at < '2026-06-01'::timestamptz THEN
     INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE achievements.slug = 'early-bird'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. SOCIAL BUTTERFLY (Joined a room)
  IF EXISTS (SELECT 1 FROM participants WHERE participants.user_id = p_user_id) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE achievements.slug = 'social-butterfly'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY 
  SELECT a.name, a.slug
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = p_user_id AND ua.unlocked_at > (now() - interval '1 minute');
END;
$$;
