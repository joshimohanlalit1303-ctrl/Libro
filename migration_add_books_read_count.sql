-- 1. Add books_read_count to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'books_read_count') THEN
        ALTER TABLE public.profiles ADD COLUMN books_read_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Backfill the count from existing user_progress
WITH computed_counts AS (
    SELECT user_id, COUNT(*) as cnt
    FROM public.user_progress
    WHERE is_completed = TRUE
    GROUP BY user_id
)
UPDATE public.profiles p
SET books_read_count = cc.cnt
FROM computed_counts cc
WHERE p.id = cc.user_id;

-- 3. Create function to maintain the count
CREATE OR REPLACE FUNCTION public.update_books_read_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.is_completed = TRUE) THEN
            UPDATE public.profiles 
            SET books_read_count = books_read_count + 1 
            WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If becoming completed
        IF (NEW.is_completed = TRUE AND OLD.is_completed = FALSE) THEN
            UPDATE public.profiles 
            SET books_read_count = books_read_count + 1 
            WHERE id = NEW.user_id;
        -- If becoming un-completed
        ELSIF (NEW.is_completed = FALSE AND OLD.is_completed = TRUE) THEN
            UPDATE public.profiles 
            SET books_read_count = GREATEST(0, books_read_count - 1) 
            WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;

    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.is_completed = TRUE) THEN
            UPDATE public.profiles 
            SET books_read_count = GREATEST(0, books_read_count - 1) 
            WHERE id = OLD.user_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS on_user_progress_completion ON public.user_progress;

CREATE TRIGGER on_user_progress_completion
AFTER INSERT OR UPDATE OR DELETE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION public.update_books_read_count();
