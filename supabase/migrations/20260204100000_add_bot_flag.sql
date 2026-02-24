-- Add is_bot column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_bot ON public.profiles(is_bot);
