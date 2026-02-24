
-- Fix type mismatch and missing foreign key relationship
BEGIN;

    -- 1. Convert book_id from TEXT to UUID (if not already)
    -- This uses specific casting. If any value is not a valid UUID, this will fail.
    -- Assuming all current values are valid UUIDs from our repair scripts.
    ALTER TABLE "rooms"
    ALTER COLUMN "book_id" TYPE uuid USING "book_id"::uuid;

    -- 2. Add the Foreign Key Constraint
    -- Check first to avoid errors if run multiple times
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'rooms_book_id_fkey' 
            AND table_name = 'rooms'
        ) THEN
            ALTER TABLE "rooms"
            ADD CONSTRAINT "rooms_book_id_fkey"
            FOREIGN KEY ("book_id")
            REFERENCES "books" ("id")
            ON DELETE SET NULL;
        END IF;
    END
    $$;

COMMIT;
