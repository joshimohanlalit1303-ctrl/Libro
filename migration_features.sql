-- Create Books Table for Global Library
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    epub_url TEXT NOT NULL,
    cover_url TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Books (Public Read, Authenticated Insert)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to books" ON public.books
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated upload to books" ON public.books
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Add Access Code to Rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Create function to generate random room codes if not handled in app
-- (Optional, but handling in App is easier for now)

-- Enable Realtime for Rooms (Fix for Deletion/Deletion Sync)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
END $$;
