-- Create journal entries table only
CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cigar_data JSONB NOT NULL, -- Store the complete cigar object
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  rating JSONB, -- Store rating object {overall, draw, burn, flavor, value}
  selected_flavors JSONB, -- Array of selected flavors
  notes TEXT,
  location JSONB, -- Store location object {city, state, country}
  photos JSONB, -- Array of photo URIs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
