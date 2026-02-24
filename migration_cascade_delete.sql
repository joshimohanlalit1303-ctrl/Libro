-- Fix User Deletion Error by adding ON DELETE CASCADE to foreign keys

-- 1. Profiles (id -> auth.users.id)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Rooms (owner_id -> auth.users.id)
ALTER TABLE public.rooms
DROP CONSTRAINT IF EXISTS rooms_owner_id_fkey,
ADD CONSTRAINT rooms_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 3. Participants (user_id -> auth.users.id)
ALTER TABLE public.participants
DROP CONSTRAINT IF EXISTS participants_user_id_fkey,
ADD CONSTRAINT participants_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 4. Books (uploaded_by -> auth.users.id)
-- Note: Check constraint name using \d books in psql if typical name doesn't match, 
-- but we try standard naming first.
ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_uploaded_by_fkey,
ADD CONSTRAINT books_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 5. Chat Messages (chat_messages -> auth.users.id)
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey,
ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 6. Annotations (annotations -> auth.users.id)
ALTER TABLE public.annotations
DROP CONSTRAINT IF EXISTS annotations_user_id_fkey,
ADD CONSTRAINT annotations_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

