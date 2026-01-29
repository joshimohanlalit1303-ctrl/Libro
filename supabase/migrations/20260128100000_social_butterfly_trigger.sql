-- Function to unlock Social Butterfly on room join
CREATE OR REPLACE FUNCTION unlock_social_butterfly()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user already has the achievement
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = NEW.user_id AND a.slug = 'social-butterfly'
  ) THEN
    -- Unlock it
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT NEW.user_id, id FROM achievements WHERE slug = 'social-butterfly'
    ON CONFLICT DO NOTHING;

    -- Award XP (Optional, e.g. 20 XP)
    PERFORM award_xp(NEW.user_id, 20);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS on_room_join ON participants;
CREATE TRIGGER on_room_join
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION unlock_social_butterfly();
