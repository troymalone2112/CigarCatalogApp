-- Check specifically for journal_entries table
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Also check if the table exists at all
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'journal_entries';

-- List all tables to see what we have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
