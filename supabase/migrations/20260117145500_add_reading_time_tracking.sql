-- 1. Add total_time_read column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_time_read bigint DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- 2. Create function to track time (called by Reader.tsx)
-- [FIX] Renaming to v2 to strictly avoid "ambiguous function" errors with previous versions
CREATE OR REPLACE FUNCTION track_reading_time_v2(seconds int, book_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update Profile Total Time
  UPDATE profiles
  SET total_time_read = COALESCE(total_time_read, 0) + seconds,
      last_active_at = now() -- Optional: track last active
  WHERE id = v_user_id;
END;
$$;
