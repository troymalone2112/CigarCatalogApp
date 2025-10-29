-- Add cigar_data column to journal_entries table to match inventory table
-- This will allow journal entries to store complete cigar information

-- Add the cigar_data column
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS cigar_data JSONB;

-- Update existing records to have an empty cigar_data object
UPDATE journal_entries SET cigar_data = '{}' WHERE cigar_data IS NULL;

-- Make it NOT NULL after populating existing records
ALTER TABLE journal_entries ALTER COLUMN cigar_data SET NOT NULL;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_cigar_data ON journal_entries USING GIN (cigar_data);

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
AND column_name = 'cigar_data';









