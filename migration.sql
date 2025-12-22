-- Run this to update foreign keys for Cascading Deletes
-- This allows rooms to be deleted even if they have participants/messages

-- 1. Participants
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_room_id_fkey;
ALTER TABLE participants ADD CONSTRAINT participants_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- 2. Chat Messages
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- 3. Annotations
ALTER TABLE annotations DROP CONSTRAINT IF EXISTS annotations_room_id_fkey;
ALTER TABLE annotations ADD CONSTRAINT annotations_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
