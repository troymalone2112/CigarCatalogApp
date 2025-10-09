-- Multi-Humidor Database Schema Migration
-- This script adds support for multiple humidors per user

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

-- 2. Add humidor_id column to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS humidor_id UUID REFERENCES humidors(id) ON DELETE CASCADE;

-- 3. Create default humidor for existing users who have inventory
INSERT INTO humidors (user_id, name, description)
SELECT DISTINCT 
  user_id, 
  'Main Humidor', 
  'Default humidor - created during migration'
FROM inventory 
WHERE humidor_id IS NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- 4. Update existing inventory records to reference the default humidor
UPDATE inventory 
SET humidor_id = h.id
FROM humidors h
WHERE inventory.humidor_id IS NULL 
  AND inventory.user_id = h.user_id 
  AND h.name = 'Main Humidor';

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_humidor_id ON inventory(humidor_id);

-- 6. Add RLS policies for humidors table
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

-- 7. Update inventory RLS policy to consider humidor access
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (humidor_id IS NULL OR EXISTS (
      SELECT 1 FROM humidors WHERE humidors.id = inventory.humidor_id AND humidors.user_id = auth.uid()
    ))
  );

-- 8. Create view for humidor statistics
CREATE OR REPLACE VIEW humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COUNT(i.id) as cigar_count,
  COALESCE(SUM(CASE WHEN c.singleStickPrice IS NOT NULL THEN c.singleStickPrice * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(c.singleStickPrice), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM humidors h
LEFT JOIN inventory i ON h.id = i.humidor_id
LEFT JOIN cigars c ON i.cigar_id = c.id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- 9. Create view for user aggregate stats
CREATE OR REPLACE VIEW user_humidor_aggregate AS
SELECT 
  user_id,
  COUNT(DISTINCT h.id) as total_humidors,
  COUNT(DISTINCT i.id) as total_cigars,
  COALESCE(SUM(CASE WHEN c.singleStickPrice IS NOT NULL THEN c.singleStickPrice * i.quantity ELSE 0 END), 0) as total_collection_value,
  COALESCE(AVG(CASE WHEN c.singleStickPrice IS NOT NULL THEN c.singleStickPrice ELSE NULL END), 0) as avg_cigar_value,
  COUNT(DISTINCT c.brand) as unique_brands
FROM humidors h
LEFT JOIN inventory i ON h.id = i.humidor_id
LEFT JOIN cigars c ON i.cigar_id = c.id
GROUP BY user_id;

-- 10. Add trigger to update updated_at timestamp
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
SELECT COUNT(*) as inventory_records_updated FROM inventory WHERE humidor_id IS NOT NULL;
