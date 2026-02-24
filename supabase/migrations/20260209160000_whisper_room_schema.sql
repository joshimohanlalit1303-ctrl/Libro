-- Add room_type and configuration to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'standard';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;

-- Policy to ensure whisper rooms have max_participants = 2
-- This can be handled in application logic, but for safety:
-- ALTER TABLE rooms ADD CONSTRAINT whisper_room_max_participants CHECK (
--     (room_type = 'whisper' AND max_participants = 2) OR (room_type != 'whisper')
-- );

-- Ensure room_type values are valid
ALTER TABLE rooms ADD CONSTRAINT valid_room_type CHECK (room_type IN ('standard', 'whisper'));
