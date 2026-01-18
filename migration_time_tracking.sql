-- 1. Add time_read_seconds to user_progress if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'time_read_seconds') THEN
        ALTER TABLE public.user_progress ADD COLUMN time_read_seconds BIGINT DEFAULT 0;
    END IF;
END $$;

-- 2. Add total_time_read to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_time_read') THEN
        ALTER TABLE public.profiles ADD COLUMN total_time_read BIGINT DEFAULT 0;
    END IF;
END $$;

-- 3. Create or Replace RPC function to atomically update time
CREATE OR REPLACE FUNCTION public.track_reading_time(book_id UUID, seconds INT)
RETURNS VOID AS $$
DECLARE
    uid UUID;
BEGIN
    -- Get current user ID
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Update user_progress (Store accumulated time for this specific book)
    -- We use ON CONFLICT to ensure we gracefully handle race conditions or missing rows (though usually rows exist by now)
    INSERT INTO public.user_progress (user_id, book_id, time_read_seconds, last_read_at)
    VALUES (uid, book_id, seconds, NOW())
    ON CONFLICT (user_id, book_id)
    DO UPDATE SET 
        time_read_seconds = public.user_progress.time_read_seconds + EXCLUDED.time_read_seconds,
        last_read_at = NOW();

    -- 2. Update profiles (Global counter)
    UPDATE public.profiles
    SET total_time_read = total_time_read + seconds
    WHERE id = uid;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.track_reading_time TO authenticated;
