-- Function to Award XP and Update Level
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_amount int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_xp bigint;
  v_new_xp bigint;
  v_current_level int;
  v_new_level int;
BEGIN
  -- Get current stats
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM profiles
  WHERE id = p_user_id;

  v_new_xp := COALESCE(v_current_xp, 0) + p_amount;
  -- Level = Floor(XP / 100) + 1
  v_new_level := FLOOR(v_new_xp / 100) + 1;

  -- Update Profile
  UPDATE profiles
  SET xp = v_new_xp,
      level = v_new_level
  WHERE id = p_user_id;

  -- Return new stats
  RETURN json_build_object(
    'xp', v_new_xp,
    'level', v_new_level,
    'leveled_up', (v_new_level > v_current_level)
  );
END;
$$;

-- Function to Check and Unlock Achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id uuid)
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
BEGIN
  -- Get user stats
  SELECT xp, streak_count INTO v_xp, v_streak
  FROM profiles
  WHERE id = p_user_id;

  -- 1. XP MILESTONES
  -- Level 2 (100 XP) -> 'getting-started' (let's assume this slug exists or create it)
  IF v_xp >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'getting-started'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. STREAK MILESTONES
  -- 3 Day Streak
  IF v_streak >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE slug = 'consistent-reader'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return newly unlocked (this is simplified, usually we'd track what was just inserted)
  -- For now, let's just return nothing or simple confirmation.
  RETURN QUERY 
  SELECT a.name, a.slug
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = p_user_id AND ua.unlocked_at > (now() - interval '1 minute');
END;
$$;

-- Add new badges for logic
INSERT INTO achievements (slug, name, description, xp_reward, icon_url) VALUES 
('getting-started', 'On The Path', 'Reached Level 2 (100 XP).', 50, 'Sunrise'),
('consistent-reader', 'Consistent Reader', ' maintained a 3-day streak.', 100, 'BookOpen'),
('quote-sharer', 'Quote Sharer', 'Shared a quote card.', 20, 'Users')
ON CONFLICT (slug) DO NOTHING;
