-- Add last_seen to participants for heartbeat logic
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Clear stale participants to fix "Stuck Active" issue immediately
TRUNCATE TABLE public.participants;
