-- Create the missing tables for the app to work properly

-- 1. Create profiles table (for user profile data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create humidors table
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

-- 3. Create inventory table
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

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;




