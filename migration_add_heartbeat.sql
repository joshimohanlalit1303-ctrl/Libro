-- Ensure participants table has last_seen column for heartbeat
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'last_seen') THEN
        ALTER TABLE public.participants ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update existing rows to have a valid last_seen
UPDATE public.participants SET last_seen = NOW() WHERE last_seen IS NULL;
