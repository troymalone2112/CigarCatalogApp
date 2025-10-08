-- Add detail_url column to cigars table
ALTER TABLE cigars ADD COLUMN IF NOT EXISTS detail_url TEXT;

-- Create index for efficient searching
CREATE INDEX IF NOT EXISTS idx_cigars_detail_url ON cigars(detail_url);
