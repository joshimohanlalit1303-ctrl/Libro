-- Add email column to profiles for public uniqueness check
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- TRIGGER UPDATE: Sync email on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BACKFILL: Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;
