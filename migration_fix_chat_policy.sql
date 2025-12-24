-- Fix RLS policies for Chat to ensure users can read/write messages

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Participants can read messages in their room
DROP POLICY IF EXISTS "Room participants can view messages" ON public.chat_messages;
CREATE POLICY "Room participants can view messages" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.room_id = chat_messages.room_id
    AND participants.user_id = auth.uid()
  )
);

-- 2. INSERT: Participants can send messages
DROP POLICY IF EXISTS "Participants can insert messages" ON public.chat_messages;
CREATE POLICY "Participants can insert messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  AND
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.room_id = chat_messages.room_id
    AND participants.user_id = auth.uid()
  )
);
