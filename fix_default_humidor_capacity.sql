-- Fix default humidor capacity issue
-- Set default capacity of 100 for all humidors that don't have a capacity set

-- Update ALL humidors that have NULL capacity to 100
UPDATE humidors 
SET capacity = 100 
WHERE capacity IS NULL;

-- Also update any humidors with capacity 0 to have a reasonable default
UPDATE humidors 
SET capacity = 100 
WHERE capacity = 0;

-- Check the results
SELECT 
  id,
  name,
  description,
  capacity,
  created_at
FROM humidors 
ORDER BY created_at DESC
LIMIT 10;

-- Check humidor_stats view to see if capacity is being passed through
SELECT 
  humidor_id,
  humidor_name,
  capacity,
  cigar_count
FROM humidor_stats 
ORDER BY created_at DESC
LIMIT 10;
