-- 1. Create 'books' table if not exists (Central Library)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    epub_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access for Books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Authenticated Users can upload books"
ON public.books FOR INSERT
WITH CHECK (auth.role() = 'authenticated');


-- 3. Fix 'user_progress' to reference 'books'
-- We originally made book_id TEXT. We should ideally convert it to UUID references books(id).
-- Option A: Drop and recreate (simplest for dev)
-- Option B: Alter column (risk of data loss if IDs don't match)

-- Let's go with a safe approach: Ensure columns exist
-- Modify user_progress to be robust
ALTER TABLE public.user_progress
    DROP CONSTRAINT IF EXISTS user_progress_pkey;

-- If book_id is already text, we might want to keep it text if we store non-UUIDs,
-- BUT for the profile query to work (joining books), it needs to match books.id
-- Let's Assume the app will now store UUIDs in book_id.
-- If you have dirty data, truncate usage.
-- TRUNCATE public.user_progress;

-- Re-define keys
ALTER TABLE public.user_progress
    ADD PRIMARY KEY (user_id, book_id);

-- Optional: Foreign Key (Start strictly enforcing data integrity)
-- ALTER TABLE public.user_progress
--    ADD CONSTRAINT fk_book
--    FOREIGN KEY (book_id)
--    REFERENCES public.books (id)
--    ON DELETE CASCADE;
-- (Commented out to avoid errors if existing text IDs are present)


-- 4. Update 'rooms' table to also link to 'books'
-- This helps us know WHICH book a room is reading
ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS book_id_ref UUID REFERENCES public.books(id);
