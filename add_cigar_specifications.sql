-- Add cigar specification fields to the inventory table
-- This will store detailed cigar information for each inventory entry

-- Add the new columns to the inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS date_acquired DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS aging_preference_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS length_inches DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS ring_gauge INTEGER,
ADD COLUMN IF NOT EXISTS vitola VARCHAR(50);

-- Create an index on date_acquired for aging calculations
CREATE INDEX IF NOT EXISTS idx_inventory_date_acquired ON inventory(date_acquired);

-- Create an index on aging_preference_months for aging notifications
CREATE INDEX IF NOT EXISTS idx_inventory_aging_preference ON inventory(aging_preference_months);

-- Update existing records to have current date as date_acquired if NULL
UPDATE inventory 
SET date_acquired = CURRENT_DATE 
WHERE date_acquired IS NULL;

-- Create a view to calculate aging status for each cigar
CREATE OR REPLACE VIEW cigar_aging_status AS
SELECT 
    i.id,
    i.user_id,
    i.humidor_id,
    i.quantity,
    i.date_acquired,
    i.aging_preference_months,
    i.length_inches,
    i.ring_gauge,
    i.vitola,
    i.cigar_data,
    
    -- Extract cigar brand and name from JSONB
    i.cigar_data->>'brand' as cigar_brand,
    i.cigar_data->>'line' as cigar_line,
    i.cigar_data->>'name' as cigar_name,
    
    -- Calculate aging status
    CASE 
        WHEN i.aging_preference_months = 0 THEN 'No aging preference'
        WHEN i.date_acquired + INTERVAL '1 month' * i.aging_preference_months <= CURRENT_DATE THEN 'Ready to smoke!'
        WHEN i.date_acquired + INTERVAL '1 month' * i.aging_preference_months <= CURRENT_DATE + INTERVAL '1 month' THEN 'Almost ready'
        ELSE 'Still aging'
    END as aging_status,
    
    -- Calculate days until ready (negative if past due)
    EXTRACT(DAYS FROM (i.date_acquired + INTERVAL '1 month' * i.aging_preference_months - CURRENT_DATE)) as days_until_ready,
    
    -- Calculate ideal smoking date
    i.date_acquired + INTERVAL '1 month' * i.aging_preference_months as ideal_smoking_date
    
FROM inventory i;

-- Grant permissions
GRANT SELECT ON cigar_aging_status TO authenticated, anon;

-- Verify the changes
SELECT 'Cigar specifications added successfully!' as status;
