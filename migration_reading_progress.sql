-- Create table for tracking user book progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Grant access
GRANT ALL ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
