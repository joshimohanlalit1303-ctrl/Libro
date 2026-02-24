-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own progress
CREATE POLICY "Users can view own progress" 
ON public.user_progress FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can insert own progress" 
ON public.user_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY "Users can update own progress" 
ON public.user_progress FOR UPDATE 
USING (auth.uid() = user_id);
