-- Add indexes for journal_entries table based on actual schema
-- Based on your table structure with smoking_date instead of date

-- Create indexes for the actual columns that exist
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_smoking_date ON journal_entries(smoking_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);

-- Note: We can't create an index on cigar_data->>'brand' because there's no cigar_data column
-- Instead, we have cigar_id which references another table

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
