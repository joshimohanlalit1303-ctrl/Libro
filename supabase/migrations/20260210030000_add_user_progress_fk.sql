
-- Add Foreign Key constraint to user_progress.book_id
ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_book_id_fkey
FOREIGN KEY (book_id)
REFERENCES public.books(id)
ON DELETE CASCADE;

-- Re-apply RLS just in case (from previous attempt)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" 
ON public.user_progress FOR SELECT 
USING (auth.uid() = user_id);
