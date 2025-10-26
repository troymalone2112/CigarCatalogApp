-- Add image_url and photos fields to journal_entries table
-- This migration adds support for storing recognition images and additional photos in journal entries

-- Add the image_url column to journal_entries table
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add the photos column to journal_entries table (JSONB array of photo URIs)
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS photos JSONB;

-- Create indexes for better performance when querying by image_url and photos
CREATE INDEX IF NOT EXISTS idx_journal_entries_image_url ON journal_entries (image_url);
CREATE INDEX IF NOT EXISTS idx_journal_entries_photos ON journal_entries USING GIN (photos);

-- Add comments to document the fields
COMMENT ON COLUMN journal_entries.image_url IS 'URL or path to the recognition image captured during journal entry creation';
COMMENT ON COLUMN journal_entries.photos IS 'JSONB array of additional photo URIs taken during the smoking experience';
