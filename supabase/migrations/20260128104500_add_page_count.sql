-- Add page_count to books table
ALTER TABLE books ADD COLUMN page_count INTEGER DEFAULT 0;
