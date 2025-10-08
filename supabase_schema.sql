-- Cigar Catalog Database Schema for Supabase
-- Run these commands in your Supabase SQL Editor

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create cigars master database
CREATE TABLE IF NOT EXISTS cigars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  line TEXT,
  name TEXT NOT NULL,
  size TEXT,
  wrapper TEXT,
  filler TEXT,
  binder TEXT,
  strength TEXT CHECK (strength IN ('Mild', 'Medium', 'Full')),
  flavor_profile TEXT[],
  tobacco_origins TEXT[],
  smoking_experience JSONB,
  image_url TEXT,
  recognition_confidence DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS for cigars (read-only for all, insert/update by admin or specific roles)
ALTER TABLE cigars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cigars are viewable by everyone." ON cigars
  FOR SELECT USING (TRUE);

-- Optional: Policy for authenticated users to insert/update cigars (e.g., for community contributions)
-- CREATE POLICY "Authenticated users can insert cigars." ON cigars
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can update cigars." ON cigars
--   FOR UPDATE USING (auth.role() = 'authenticated');


-- Create user inventory
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cigar_id UUID REFERENCES cigars(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  purchase_date DATE,
  purchase_price DECIMAL,
  location TEXT, -- Humidor location
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS for user_inventory
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory." ON user_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own inventory." ON user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory." ON user_inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own inventory." ON user_inventory
  FOR DELETE USING (auth.uid() = user_id);


-- Create journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cigar_id UUID REFERENCES cigars(id) ON DELETE CASCADE,
  rating_overall INTEGER CHECK (rating_overall >= 1 AND rating_overall <= 10),
  rating_construction INTEGER,
  rating_draw INTEGER,
  rating_flavor INTEGER,
  notes TEXT,
  smoking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS for journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries." ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries." ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries." ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries." ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);


-- Create user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  favorite_strengths TEXT[],
  favorite_flavors TEXT[],
  favorite_origins TEXT[],
  disliked_flavors TEXT[],
  preferred_sizes TEXT[],
  budget_min DECIMAL,
  budget_max DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences." ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences." ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences." ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Add unique constraint for cigars to prevent duplicates
ALTER TABLE cigars ADD CONSTRAINT unique_brand_name UNIQUE (brand, name);

-- Optional: Add sample cigars
INSERT INTO cigars (brand, line, name, size, wrapper, filler, binder, strength, flavor_profile, tobacco_origins, smoking_experience, image_url)
VALUES
('Montecristo', 'No. 2', 'Torpedo', '6.1 x 52', 'Corojo', 'Dominican', 'Dominican', 'Medium', ARRAY['Cedar', 'Nutty', 'Coffee'], ARRAY['Dominican Republic'], '{"first": "Cedar, light spice", "second": "Coffee, nuts", "final": "Creamy, earthy"}', 'https://example.com/montecristo_no2.jpg'),
('Romeo y Julieta', '1875', 'Bully', '5 x 50', 'Indonesian TBN', 'Dominican', 'Dominican', 'Mild', ARRAY['Earthy', 'Sweet', 'Woody'], ARRAY['Dominican Republic', 'Indonesia'], '{"first": "Sweet wood, mild spice", "second": "Earthy, creamy", "final": "Smooth, consistent"}', 'https://example.com/romeo_y_julieta_1875.jpg'),
('Cohiba', 'Robusto', 'Robusto', '4.9 x 50', 'Corojo', 'Cuban', 'Cuban', 'Full', ARRAY['Leather', 'Coffee', 'Spice'], ARRAY['Cuba'], '{"first": "Bold spice, leather", "second": "Rich coffee, dark chocolate", "final": "Earthy, peppery"}', 'https://example.com/cohiba_robusto.jpg'),
('Padron', '1964 Anniversary', 'Exclusivo', '5.5 x 50', 'Nicaraguan Maduro', 'Nicaraguan', 'Nicaraguan', 'Full', ARRAY['Cocoa', 'Coffee', 'Earth'], ARRAY['Nicaragua'], '{"first": "Dark cocoa, espresso", "second": "Earthy, sweet spice", "final": "Rich, complex"}', 'https://example.com/padron_1964.jpg'),
('Arturo Fuente', 'OpusX', 'Robusto', '5.2 x 50', 'Dominican Rosado', 'Dominican', 'Dominican', 'Full', ARRAY['Cedar', 'Spice', 'Cream'], ARRAY['Dominican Republic'], '{"first": "Cedar, white pepper", "second": "Creamy, sweet wood", "final": "Floral, complex"}', 'https://example.com/opusx_robusto.jpg')
ON CONFLICT (brand, name) DO NOTHING; -- Prevents inserting duplicates if run multiple times

-- Set up function to update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables (drop existing triggers first)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cigars_updated_at ON cigars;
CREATE TRIGGER update_cigars_updated_at
  BEFORE UPDATE ON cigars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_inventory_updated_at ON user_inventory;
CREATE TRIGGER update_user_inventory_updated_at
  BEFORE UPDATE ON user_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
