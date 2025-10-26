-- Verify all required tables exist and have proper structure

-- Check if all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'humidors', 'inventory', 'journal_entries')
ORDER BY table_name;

-- Check profiles table structure
SELECT 'profiles' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check humidors table structure  
SELECT 'humidors' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'humidors'
ORDER BY ordinal_position;

-- Check inventory table structure
SELECT 'inventory' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'inventory'
ORDER BY ordinal_position;

-- Check journal_entries table structure
SELECT 'journal_entries' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;






