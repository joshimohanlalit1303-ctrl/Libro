-- Add XP and Level to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp bigint DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level int DEFAULT 1;

-- Create Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon_url text,
  xp_reward int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create User Achievements Join Table
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- RLS Settings
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON achievements;
CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON user_achievements;
CREATE POLICY "User achievements are viewable by everyone" ON user_achievements FOR SELECT USING (true);

-- Seed initial achievements
INSERT INTO achievements (slug, name, description, xp_reward, icon_url) VALUES 
('early-bird', 'Early Bird', 'Joined Libro in its early days.', 100, 'Sunrise'),
('bookworm', 'Bookworm', 'Read your first book.', 50, 'BookOpen'),
('social-butterfly', 'Social Butterfly', 'Joined a reading room.', 50, 'Users')
ON CONFLICT (slug) DO NOTHING;
