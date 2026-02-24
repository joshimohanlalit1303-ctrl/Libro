-- 1. Ensure last_seen column exists in participants
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure Realtime is enabled for all critical tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE participants;
  END IF;
END $$;

-- 3. Fix Chat RLS Policies (Drop and Recreate to be safe)
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
CREATE POLICY "Participants can view messages" ON chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants.room_id = chat_messages.room_id
    AND participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can insert messages" ON chat_messages;
CREATE POLICY "Participants can insert messages" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants.room_id = chat_messages.room_id
    AND participants.user_id = auth.uid()
  )
);

-- 4. Clean up any stuck/duplicate participants just in case
-- (Optional: removing this to avoid deleting valid users, but "last_seen" update will fix them)
-- TRUNCATE TABLE participants; 
