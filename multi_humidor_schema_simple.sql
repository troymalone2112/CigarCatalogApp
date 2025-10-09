-- Multi-Humidor Database Schema Migration (Simplified)
-- This script adds support for multiple humidors per user
-- Note: This version works with local storage (AsyncStorage) for inventory

-- 1. Create humidors table
CREATE TABLE IF NOT EXISTS humidors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  capacity INTEGER, -- optional capacity limit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Prevent duplicate names per user
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);

-- 3. Add RLS policies for humidors table
ALTER TABLE humidors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own humidors
CREATE POLICY "Users can view their own humidors" ON humidors
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own humidors
CREATE POLICY "Users can insert their own humidors" ON humidors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own humidors
CREATE POLICY "Users can update their own humidors" ON humidors
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own humidors
CREATE POLICY "Users can delete their own humidors" ON humidors
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create view for humidor statistics (simplified for local storage)
CREATE OR REPLACE VIEW humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  0 as cigar_count, -- Will be calculated by the app from local storage
  0 as total_value, -- Will be calculated by the app from local storage
  0 as avg_cigar_price, -- Will be calculated by the app from local storage
  h.created_at,
  h.updated_at
FROM humidors h;

-- 5. Create view for user aggregate stats (simplified for local storage)
CREATE OR REPLACE VIEW user_humidor_aggregate AS
SELECT 
  user_id,
  COUNT(DISTINCT h.id) as total_humidors,
  0 as total_cigars, -- Will be calculated by the app from local storage
  0 as total_collection_value, -- Will be calculated by the app from local storage
  0 as avg_cigar_value, -- Will be calculated by the app from local storage
  0 as unique_brands -- Will be calculated by the app from local storage
FROM humidors h
GROUP BY user_id;

-- 6. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_humidor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_humidor_updated_at
  BEFORE UPDATE ON humidors
  FOR EACH ROW
  EXECUTE FUNCTION update_humidor_updated_at();

-- Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as total_humidors_created FROM humidors;
