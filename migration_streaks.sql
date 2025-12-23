-- Add streak tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    last_date DATE;
    current_streak INTEGER;
BEGIN
    SELECT last_active_date, streak_count INTO last_date, current_streak
    FROM public.profiles
    WHERE id = user_uuid;

    -- If first time
    IF last_date IS NULL THEN
        UPDATE public.profiles 
        SET streak_count = 1, last_active_date = current_date
        WHERE id = user_uuid;
        RETURN;
    END IF;

    -- If active today, do nothing
    IF last_date = current_date THEN
        RETURN;
    END IF;

    -- If active yesterday, increment
    IF last_date = current_date - 1 THEN
        UPDATE public.profiles 
        SET streak_count = current_streak + 1, last_active_date = current_date
        WHERE id = user_uuid;
    ELSE
        -- Streak broken, reset to 1 (since they are active now)
        UPDATE public.profiles 
        SET streak_count = 1, last_active_date = current_date
        WHERE id = user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
