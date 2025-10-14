-- Set up RLS policies and indexes for the missing tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE humidors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Humidors RLS policies
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

-- Inventory RLS policies
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_humidor_id ON inventory(humidor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_cigar_brand ON inventory ((cigar_data->>'brand'));
CREATE INDEX IF NOT EXISTS idx_inventory_cigar_line ON inventory ((cigar_data->>'line'));




