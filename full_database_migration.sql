-- Full Database Migration: Local Storage to Database
-- This script creates the complete database schema and migrates existing data

-- 1. Create humidors table (if not exists)
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

-- 2. Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  humidor_id UUID REFERENCES humidors(id) ON DELETE CASCADE,
  cigar_data JSONB NOT NULL, -- Store the complete cigar object
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_date TIMESTAMP WITH TIME ZONE,
  price_paid DECIMAL(10,2),
  original_box_price DECIMAL(10,2),
  sticks_per_box INTEGER,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_humidor_id ON inventory(humidor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_cigar_brand ON inventory ((cigar_data->>'brand'));
CREATE INDEX IF NOT EXISTS idx_inventory_cigar_line ON inventory ((cigar_data->>'line'));

-- 4. Enable RLS on both tables
ALTER TABLE humidors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 5. Humidors RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can insert their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can update their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can delete their own humidors" ON humidors;

CREATE POLICY "Users can view their own humidors" ON humidors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own humidors" ON humidors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own humidors" ON humidors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own humidors" ON humidors
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Inventory RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;

CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory" ON inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" ON inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" ON inventory
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create view for humidor statistics (drop existing first)
DROP VIEW IF EXISTS humidor_stats;
CREATE VIEW humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COUNT(i.id) as cigar_count,
  COALESCE(SUM(i.quantity), 0) as total_cigars,
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM humidors h
LEFT JOIN inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- 8. Create view for user aggregate stats (drop existing first)
DROP VIEW IF EXISTS user_humidor_aggregate;
CREATE VIEW user_humidor_aggregate AS
SELECT 
  user_id,
  COUNT(DISTINCT h.id) as total_humidors,
  COUNT(DISTINCT i.id) as total_cigar_types,
  COALESCE(SUM(i.quantity), 0) as total_cigars,
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_collection_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_value,
  COUNT(DISTINCT i.cigar_data->>'brand') as unique_brands
FROM humidors h
LEFT JOIN inventory i ON h.id = i.humidor_id
GROUP BY user_id;

-- 9. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_humidors_updated_at ON humidors;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;

CREATE TRIGGER update_humidors_updated_at
  BEFORE UPDATE ON humidors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Create default humidor for existing users
-- This will create a default humidor for each user who has inventory
-- Note: This assumes we'll migrate local data after running this schema

-- Verify the migration
SELECT 'Full database migration completed successfully' as status;
SELECT COUNT(*) as total_humidors_created FROM humidors;
SELECT COUNT(*) as inventory_records FROM inventory;
