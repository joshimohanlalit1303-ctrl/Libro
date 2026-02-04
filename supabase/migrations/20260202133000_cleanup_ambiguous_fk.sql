-- Drop the ambiguous duplicate Foreign Key constraint
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_book_id_ref_fkey";

-- Drop the redundant column if it exists
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "book_id_ref";
