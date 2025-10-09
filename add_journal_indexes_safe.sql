-- Add indexes for journal_entries table one by one (safer approach)

-- First, check if the table and columns exist
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        RAISE NOTICE 'Table journal_entries exists';
        
        -- Check if user_id column exists and create index
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
            RAISE NOTICE 'Created user_id index';
        ELSE
            RAISE NOTICE 'user_id column does not exist';
        END IF;
        
        -- Check if date column exists and create index
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
            RAISE NOTICE 'Created date index';
        ELSE
            RAISE NOTICE 'date column does not exist';
        END IF;
        
        -- Check if cigar_data column exists and create index
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'cigar_data') THEN
            CREATE INDEX IF NOT EXISTS idx_journal_entries_cigar_brand ON journal_entries ((cigar_data->>'brand'));
            RAISE NOTICE 'Created cigar_brand index';
        ELSE
            RAISE NOTICE 'cigar_data column does not exist';
        END IF;
        
    ELSE
        RAISE NOTICE 'Table journal_entries does not exist';
    END IF;
END $$;

-- Enable RLS on journal_entries table
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for journal_entries
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

CREATE POLICY "Users can view their own journal entries" ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);
