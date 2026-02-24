-- ==========================================
-- 1. CLEANUP (Optional - Be Careful!)
-- ==========================================
-- DROP TABLE IF EXISTS annotations CASCADE;
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS participants CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;
-- DROP TABLE IF EXISTS lib_books CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- LIBRARY BOOKS (New: For searching/selecting uploaded ePubs)
CREATE TABLE IF NOT EXISTS lib_books (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  author text,
  description text,
  cover_url text,
  epub_url text NOT NULL, -- Path to file in storage or full URL
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  book_id text NOT NULL, -- Can be a custom ID or reference lib_books.id
  epub_url text,         -- Snapshot of the URL at creation time
  cover_url text,        -- Snapshot of the cover at creation time
  max_participants integer DEFAULT 10,
  privacy text CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
  owner_id uuid REFERENCES profiles(id)
);

-- PARTICIPANTS (Junction table)
CREATE TABLE IF NOT EXISTS participants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  role text CHECK (role IN ('host', 'viewer')) DEFAULT 'viewer',
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ANNOTATIONS
CREATE TABLE IF NOT EXISTS annotations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  cfi_range text NOT NULL,
  note text,
  highlight_color text DEFAULT '#FFEB3B',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lib_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Library Policies (Everyone can read, only auth users upload)
DROP POLICY IF EXISTS "Library is viewable by everyone." ON lib_books;
CREATE POLICY "Library is viewable by everyone." ON lib_books FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can upload books." ON lib_books;
CREATE POLICY "Auth users can upload books." ON lib_books FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Rooms Policies
DROP POLICY IF EXISTS "Rooms are viewable by everyone." ON rooms;
CREATE POLICY "Rooms are viewable by everyone." ON rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create rooms." ON rooms;
CREATE POLICY "Authenticated users can create rooms." ON rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their rooms." ON rooms;
CREATE POLICY "Owners can delete their rooms." ON rooms FOR DELETE USING (auth.uid() = owner_id);

-- Participants Policies
DROP POLICY IF EXISTS "Public view participants" ON participants;
CREATE POLICY "Public view participants" ON participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "User can join/leave" ON participants;
CREATE POLICY "User can join/leave" ON participants FOR ALL USING (auth.uid() = user_id);

-- Chat Policies
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

-- Annotations Policies
DROP POLICY IF EXISTS "Participants can view annotations" ON annotations;
CREATE POLICY "Participants can view annotations" ON annotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants.room_id = annotations.room_id
    AND participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can create annotations" ON annotations;
CREATE POLICY "Participants can create annotations" ON annotations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants.room_id = annotations.room_id
    AND participants.user_id = auth.uid()
  )
);

-- ==========================================
-- 4. REALTIME PUBLICATION
-- ==========================================
-- Drop before adding to avoid error if they exist (though 'add table' assumes distinct usually, safe to leave as is often, but let's be safe)
-- Actually supabase realtime publication management is tricky in pure SQL idempotent scripts without PL/pgSQL checks.
-- For standard 'alter publication ... add table', it errors if table already in pub.
-- We will wrap in DO block for safety.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'annotations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  END IF;
END $$;

-- ==========================================
-- 5. STORAGE BUCKETS
-- ==========================================
-- Note: Often needs to be done in Dashboard, but SQL can attempt it
INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to Books" ON storage.objects;
CREATE POLICY "Public Access to Books" ON storage.objects FOR SELECT USING ( bucket_id = 'books' );

DROP POLICY IF EXISTS "Auth Upload to Books" ON storage.objects;
CREATE POLICY "Auth Upload to Books" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'books' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Public Access to Covers" ON storage.objects;
CREATE POLICY "Public Access to Covers" ON storage.objects FOR SELECT USING ( bucket_id = 'covers' );

DROP POLICY IF EXISTS "Auth Upload to Covers" ON storage.objects;
CREATE POLICY "Auth Upload to Covers" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'covers' AND auth.role() = 'authenticated' );
