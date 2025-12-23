-- Fix User Deletion Error AND Relationship Schema Cache Error
-- We need to reference public.profiles instead of auth.users so that
-- Supabase client can "see" the relationship for joins (e.g. select(..., profiles(username))).

-- 1. Profiles (id -> auth.users.id) - Keep as is (Root of the cascade)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Rooms (owner_id -> public.profiles.id)
ALTER TABLE public.rooms
DROP CONSTRAINT IF EXISTS rooms_owner_id_fkey,
ADD CONSTRAINT rooms_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 3. Participants (user_id -> public.profiles.id)
ALTER TABLE public.participants
DROP CONSTRAINT IF EXISTS participants_user_id_fkey,
ADD CONSTRAINT participants_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 4. Books (uploaded_by -> public.profiles.id)
ALTER TABLE public.books
DROP CONSTRAINT IF EXISTS books_uploaded_by_fkey,
ADD CONSTRAINT books_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 5. Chat Messages (user_id -> public.profiles.id)
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey,
ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 6. Annotations (user_id -> public.profiles.id)
ALTER TABLE public.annotations
DROP CONSTRAINT IF EXISTS annotations_user_id_fkey,
ADD CONSTRAINT annotations_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 7. User Progress (user_id -> public.profiles.id) - New table
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey,
ADD CONSTRAINT user_progress_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
