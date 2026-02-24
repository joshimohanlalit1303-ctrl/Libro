
-- 1. Fix RLS on user_progress (ensure no restrictions on viewing own completed books)
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" 
ON public.user_progress FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Ensure Books are readable
DROP POLICY IF EXISTS "Allow public read access" ON public.books;
CREATE POLICY "Allow public read access"
ON public.books FOR SELECT
USING (true);

-- 3. Data Repair: Force is_completed = true if progress >= 100
UPDATE public.user_progress
SET is_completed = true
WHERE progress_percentage >= 100 AND (is_completed IS NULL OR is_completed = false);

-- 4. Sync Profile Count (One last time, just to be sure)
DO $$
DECLARE
    r RECORD;
    v_actual_count int;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        SELECT count(*) INTO v_actual_count
        FROM user_progress
        WHERE user_id = r.id AND is_completed = true;

        UPDATE profiles
        SET books_read_count = v_actual_count
        WHERE id = r.id;
    END LOOP;
END $$;
