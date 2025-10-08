-- Cigar Recommendations Database Schema
-- This schema is designed for efficient recommendations and user preference matching

-- Create the main cigars table
CREATE TABLE cigars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_name TEXT NOT NULL,
    cigar_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (brand_name || ' ' || cigar_name) STORED,
    rating INTEGER NOT NULL CHECK (rating >= 90 AND rating <= 100),
    price_usd DECIMAL(10,2) NOT NULL,
    strength TEXT NOT NULL CHECK (strength IN ('Mild', 'Medium', 'Medium-Full', 'Full')),
    description TEXT NOT NULL,
    detail_url TEXT,
    image_url TEXT, -- Image filename (e.g., "01_my_father_judge_grand_robusto.jpeg")
    image_path TEXT, -- Full path for app usage (e.g., "assets/Cigar_Images/01_my_father_judge_grand_robusto.jpeg")
    year_listed INTEGER, -- 2022, 2023, or 2024
    rank_in_year INTEGER, -- Position in that year's top 25
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient searching
CREATE INDEX idx_cigars_brand ON cigars(brand_name);
CREATE INDEX idx_cigars_rating ON cigars(rating DESC);
CREATE INDEX idx_cigars_price ON cigars(price_usd);
CREATE INDEX idx_cigars_strength ON cigars(strength);
CREATE INDEX idx_cigars_year ON cigars(year_listed);
CREATE INDEX idx_cigars_fulltext ON cigars USING gin(to_tsvector('english', brand_name || ' ' || cigar_name || ' ' || description));

-- Create flavor profiles table for detailed flavor analysis
CREATE TABLE cigar_flavor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cigar_id UUID REFERENCES cigars(id) ON DELETE CASCADE,
    flavor_tag TEXT NOT NULL,
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flavor_cigar_id ON cigar_flavor_profiles(cigar_id);
CREATE INDEX idx_flavor_tag ON cigar_flavor_profiles(flavor_tag);

-- Create user preferences table for recommendation engine
CREATE TABLE user_cigar_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_brands TEXT[] DEFAULT '{}',
    preferred_strength TEXT CHECK (preferred_strength IN ('Mild', 'Medium', 'Medium-Full', 'Full')),
    min_rating INTEGER DEFAULT 90,
    max_price_usd DECIMAL(10,2),
    favorite_flavors TEXT[] DEFAULT '{}',
    disliked_brands TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_cigar_preferences(user_id);

-- Create recommendation cache table for performance
CREATE TABLE recommendation_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL, -- 'similar_to', 'based_on_rating', 'price_range', etc.
    parameters JSONB NOT NULL, -- Store the parameters used for this recommendation
    recommended_cigar_ids UUID[] NOT NULL,
    scores DECIMAL[] NOT NULL, -- Match scores for each cigar
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recommendation_cache_user_type ON recommendation_cache(user_id, recommendation_type);
CREATE INDEX idx_recommendation_cache_expires ON recommendation_cache(expires_at);

-- Create cigar images table (for when you add images)
CREATE TABLE cigar_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cigar_id UUID REFERENCES cigars(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'main', -- 'main', 'band', 'packaging', etc.
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cigar_images_cigar_id ON cigar_images(cigar_id);

-- Create views for easier querying
CREATE VIEW cigar_recommendations_view AS
SELECT 
    c.*,
    array_agg(cfp.flavor_tag ORDER BY cfp.intensity DESC) as flavor_tags,
    array_agg(cfp.intensity ORDER BY cfp.intensity DESC) as flavor_intensities
FROM cigars c
LEFT JOIN cigar_flavor_profiles cfp ON c.id = cfp.cigar_id
GROUP BY c.id, c.brand_name, c.cigar_name, c.rating, c.price_usd, c.strength, c.description, c.detail_url, c.year_listed, c.rank_in_year, c.created_at, c.updated_at;

-- Enable Row Level Security
ALTER TABLE cigars ENABLE ROW LEVEL SECURITY;
ALTER TABLE cigar_flavor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cigar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cigar_images ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to cigars
CREATE POLICY "Allow public read access to cigars" ON cigars FOR SELECT USING (true);
CREATE POLICY "Allow public read access to flavor profiles" ON cigar_flavor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to images" ON cigar_images FOR SELECT USING (true);

-- Create policies for user-specific data
CREATE POLICY "Users can manage their own preferences" ON user_cigar_preferences 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own recommendation cache" ON recommendation_cache 
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_cigars_updated_at BEFORE UPDATE ON cigars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_cigar_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for generating recommendations
CREATE OR REPLACE FUNCTION get_cigar_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_min_rating INTEGER DEFAULT 90,
    p_max_price DECIMAL DEFAULT NULL,
    p_preferred_strength TEXT DEFAULT NULL
)
RETURNS TABLE (
    cigar_id UUID,
    brand_name TEXT,
    cigar_name TEXT,
    rating INTEGER,
    price_usd DECIMAL,
    strength TEXT,
    match_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.brand_name,
        c.cigar_name,
        c.rating,
        c.price_usd,
        c.strength,
        (
            -- Calculate match score based on user preferences
            CASE WHEN c.rating >= p_min_rating THEN 1.0 ELSE 0.0 END +
            CASE WHEN p_max_price IS NULL OR c.price_usd <= p_max_price THEN 1.0 ELSE 0.0 END +
            CASE WHEN p_preferred_strength IS NULL OR c.strength = p_preferred_strength THEN 1.0 ELSE 0.5 END +
            -- Bonus for higher ratings
            (c.rating - 90.0) / 10.0 * 0.5
        ) as match_score
    FROM cigars c
    WHERE 
        (p_min_rating IS NULL OR c.rating >= p_min_rating)
        AND (p_max_price IS NULL OR c.price_usd <= p_max_price)
        AND (p_preferred_strength IS NULL OR c.strength = p_preferred_strength)
    ORDER BY match_score DESC, c.rating DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
