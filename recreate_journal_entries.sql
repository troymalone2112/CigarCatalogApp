-- Drop and recreate journal_entries table if it exists
DROP TABLE IF EXISTS journal_entries CASCADE;

-- Create journal entries table with proper structure
CREATE TABLE journal_entries (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cigar_data JSONB NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  rating JSONB,
  selected_flavors JSONB,
  notes TEXT,
  location JSONB,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify the table was created correctly
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;
