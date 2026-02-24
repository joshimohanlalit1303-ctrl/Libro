-- Create vocabulary_vault table for the Vocabulary Alchemist feature
CREATE TABLE IF NOT EXISTS public.vocabulary_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    essence TEXT,
    origin TEXT,
    synonyms JSONB DEFAULT '{}'::jsonb,
    incantations JSONB DEFAULT '{}'::jsonb,
    rarity TEXT CHECK (rarity IN ('Copper', 'Silver', 'Gold')),
    phonetic TEXT,
    book_context TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure a user can't transmute the same word twice (optional, but keeps collection clean)
    UNIQUE(user_id, word)
);

-- Enable RLS
ALTER TABLE public.vocabulary_vault ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own vocabulary vault"
    ON public.vocabulary_vault FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add words to their vocabulary vault"
    ON public.vocabulary_vault FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete words from their vocabulary vault"
    ON public.vocabulary_vault FOR DELETE
    USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_vault_user_id ON public.vocabulary_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_vault_word ON public.vocabulary_vault(word);
