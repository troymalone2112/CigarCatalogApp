-- Add indexes for journal_entries table
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_cigar_brand ON journal_entries ((cigar_data->>'brand'));

-- Alternative approach if date column doesn't exist - check table structure first
-- If the above fails, run this query to see what columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries';

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
