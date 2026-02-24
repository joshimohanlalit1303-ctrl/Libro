-- Add created_at column to profiles table
-- Default to now() for existing users so they qualify as founding members
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update the view logic if necessary (optional, but good practice to reflect schema changes)
-- In this case leaderboard view uses profiles.* so it should automatically pick it up, 
-- but explicit rebuilds are sometimes safer if views are materialized or strict.
-- Regular views usually adapt.
