-- Update strength schema to use new 5-level system
-- Run this in Supabase SQL Editor

-- First, update the existing cigars table to use the new strength values
UPDATE cigars 
SET strength = CASE 
  WHEN strength = 'Strong' THEN 'Medium-Full'
  WHEN strength = 'Mild' THEN 'Mild'
  WHEN strength = 'Medium' THEN 'Medium'
  ELSE 'Medium' -- Default fallback
END;

-- Update the constraint to allow the new strength values
ALTER TABLE cigars DROP CONSTRAINT IF EXISTS cigars_strength_check;
ALTER TABLE cigars ADD CONSTRAINT cigars_strength_check 
  CHECK (strength IN ('Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'));

-- Also update any user preferences that might have strength references
UPDATE user_cigar_preferences 
SET preferred_strength = CASE 
  WHEN preferred_strength = 'Strong' THEN 'Medium-Full'
  WHEN preferred_strength = 'Mild' THEN 'Mild'
  WHEN preferred_strength = 'Medium' THEN 'Medium'
  ELSE 'Medium'
END
WHERE preferred_strength IS NOT NULL;

-- Update the constraint for user preferences as well
ALTER TABLE user_cigar_preferences DROP CONSTRAINT IF EXISTS user_cigar_preferences_preferred_strength_check;
ALTER TABLE user_cigar_preferences ADD CONSTRAINT user_cigar_preferences_preferred_strength_check 
  CHECK (preferred_strength IN ('Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'));

-- Show the results
SELECT 'Updated cigars table' as table_name, strength, COUNT(*) as count 
FROM cigars 
GROUP BY strength 
ORDER BY 
  CASE strength 
    WHEN 'Mild' THEN 1
    WHEN 'Mild-Medium' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Medium-Full' THEN 4
    WHEN 'Full' THEN 5
    ELSE 6
  END;

SELECT 'Updated user preferences' as table_name, preferred_strength, COUNT(*) as count 
FROM user_cigar_preferences 
WHERE preferred_strength IS NOT NULL
GROUP BY preferred_strength 
ORDER BY 
  CASE preferred_strength 
    WHEN 'Mild' THEN 1
    WHEN 'Mild-Medium' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Medium-Full' THEN 4
    WHEN 'Full' THEN 5
    ELSE 6
  END;
