-- Ensure standard participants table RLS allows reading counts
-- Drop existing policy if it's too restrictive (optional, but safer to add a broad read)

DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.participants;

CREATE POLICY "Participants are viewable by everyone" ON public.participants
    FOR SELECT USING (true);

-- Re-run the fix logic just in case
SELECT check_achievements(auth.uid());
