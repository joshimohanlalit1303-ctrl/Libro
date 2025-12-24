-- Fix RLS policies for participants table to ensure Dashboard can read them

-- Enable RLS just in case
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- 1. VIEW: Everyone can view participants (needed for Dashboard counts and Room user lists)
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.participants;
CREATE POLICY "Participants are viewable by everyone" 
ON public.participants FOR SELECT 
USING ( true );

-- 2. INSERT: Users can join rooms (add themselves)
DROP POLICY IF EXISTS "Users can join rooms" ON public.participants;
CREATE POLICY "Users can join rooms" 
ON public.participants FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- 3. UPDATE: Users can update their own status (last_seen)
DROP POLICY IF EXISTS "Users can update their own status" ON public.participants;
CREATE POLICY "Users can update their own status" 
ON public.participants FOR UPDATE 
USING ( auth.uid() = user_id );

-- 4. DELETE: Users can leave, Owners can remove
DROP POLICY IF EXISTS "Users can leave or owners can remove" ON public.participants;
CREATE POLICY "Users can leave or owners can remove" 
ON public.participants FOR DELETE 
USING ( 
    auth.uid() = user_id -- User leaves
    OR 
    EXISTS ( -- OR Room Owner removes
        SELECT 1 FROM public.rooms 
        WHERE rooms.id = participants.room_id 
        AND rooms.owner_id = auth.uid()
    )
);
