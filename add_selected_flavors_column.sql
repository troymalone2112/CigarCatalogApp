-- Add selected_flavors column to journal_entries table if it doesn't exist
-- This migration ensures the column exists for storing flavor profiles

-- Check if the column exists and add it if it doesn't
DO $$
BEGIN
    -- Check if selected_flavors column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'journal_entries' 
        AND column_name = 'selected_flavors'
    ) THEN
        -- Add the selected_flavors column
        ALTER TABLE journal_entries 
        ADD COLUMN selected_flavors JSONB;
        
        RAISE NOTICE 'Added selected_flavors column to journal_entries table';
    ELSE
        RAISE NOTICE 'selected_flavors column already exists in journal_entries table';
    END IF;
END $$;

-- Create an index on selected_flavors for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_selected_flavors 
ON journal_entries USING GIN (selected_flavors);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
AND column_name = 'selected_flavors';
