
-- Fix ambiguous column reference in reading time tracking RPC
-- Must DROP first because we are renaming a parameter
DROP FUNCTION IF EXISTS track_reading_time_v3(int, uuid);

CREATE OR REPLACE FUNCTION track_reading_time_v3(seconds int, p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Update Global Profile Time
  UPDATE profiles
  SET total_time_read = COALESCE(total_time_read, 0) + seconds,
      last_active_at = now()
  WHERE id = v_user_id;

  -- 2. Update Per-Book Time in user_progress
  IF p_book_id IS NOT NULL THEN
      INSERT INTO user_progress (user_id, book_id, time_read_seconds, last_read_at)
      VALUES (v_user_id, p_book_id, seconds, now())
      ON CONFLICT (user_id, book_id)
      DO UPDATE SET
          time_read_seconds = COALESCE(user_progress.time_read_seconds, 0) + EXCLUDED.time_read_seconds,
          last_read_at = now();
  END IF;
END;
$$;
