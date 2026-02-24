-- Add current_location to user_progress for accurate restore
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Update the RLS policies if needed (usually implicit for owner)
-- Ensure the column is accessible
COMMENT ON COLUMN public.user_progress.current_location IS 'The exact CFI string for the last read position';
