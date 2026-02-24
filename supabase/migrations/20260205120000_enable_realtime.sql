
-- Enable Realtime for Messages (Chat) and Friendships (Notifications)
begin;
  -- check if publication exists (it usually does in Supabase)
  -- If not, we create it. If yes, we alter it.
  -- Simpler: just try adding.
  
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table friendships;
  
commit;
