-- Add document_url column to files table for storing uploaded file URLs
ALTER TABLE files ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS document_name TEXT;
