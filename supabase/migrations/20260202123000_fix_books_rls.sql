
-- Enable RLS on books (if not already enabled)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Allow public read access to books
-- We use DO block to avoid error if policy already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'books'
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access"
        ON books
        FOR SELECT
        USING (true);
    END IF;
END
$$;
