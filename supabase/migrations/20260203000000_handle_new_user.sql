-- Function to handle new user creation
-- Automatically creates a profile for new users (e.g. Google Sign-In)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  username_val text;
  avatar_val text;
BEGIN
  -- 1. Determine Username
  -- Try 'username' from metadata (if passed via sign-up options)
  username_val := new.raw_user_meta_data->>'username';
  
  -- If not found (e.g. standard OAuth), derive from email + random suffix to ensure uniqueness
  IF username_val IS NULL THEN
    username_val := split_part(new.email, '@', 1) || '_' || floor(random() * 1000)::text;
  END IF;

  -- 2. Determine Avatar
  -- Try 'avatar_url' from metadata (Google often provides this)
  avatar_val := new.raw_user_meta_data->>'avatar_url';
  
  -- Fallback to Dicebear if no avatar provided
  IF avatar_val IS NULL THEN
    avatar_val := 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username_val;
  END IF;

  -- 3. Insert into Profiles
  -- We use ON CONFLICT DO NOTHING just in case the app tried to create it simultaneously
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, username_val, avatar_val)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Trigger setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
