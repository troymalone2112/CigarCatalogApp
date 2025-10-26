-- Add pricing and quantity tracking fields to cigars table
-- This migration adds single stick pricing and updates inventory tracking

-- Add single stick price field to cigars table
ALTER TABLE cigars 
ADD COLUMN single_stick_price VARCHAR(20);

-- Add single stick price field to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN single_stick_price DECIMAL(10,2);

-- Update existing inventory items to have quantity if they don't already
-- (This assumes quantity field already exists, but ensures it's set to 1 if null)
UPDATE inventory_items 
SET quantity = 1 
WHERE quantity IS NULL OR quantity = 0;

-- Add comments for documentation
COMMENT ON COLUMN cigars.single_stick_price IS 'Price for one individual cigar in USD';
COMMENT ON COLUMN inventory_items.single_stick_price IS 'Price per individual cigar in USD';
COMMENT ON COLUMN inventory_items.quantity IS 'Number of cigars in humidor';

-- Create index on quantity for faster inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory_items(quantity);

-- Create index on single stick price for price-based filtering
CREATE INDEX IF NOT EXISTS idx_cigars_single_stick_price ON cigars(single_stick_price);

-- Update RLS policies if needed (assuming they exist)
-- These policies should already cover the new fields through the existing table permissions

-- Example of how to use the new fields:
-- SELECT 
--   c.brand,
--   c.line,
--   c.name,
--   c.single_stick_price,
--   i.quantity,
--   (c.single_stick_price::DECIMAL * i.quantity) as total_value
-- FROM cigars c
-- JOIN inventory_items i ON c.id = i.cigar_id
-- WHERE i.user_id = auth.uid();









