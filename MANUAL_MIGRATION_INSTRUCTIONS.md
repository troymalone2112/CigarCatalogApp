# Manual Migration: Add selected_flavors Column

Since the automated migration didn't work, you need to run these SQL commands manually in your Supabase dashboard:

## Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt
   - Go to the SQL Editor

2. **Run this SQL command:**

```sql
-- Add the selected_flavors column to journal_entries table
ALTER TABLE journal_entries
ADD COLUMN selected_flavors JSONB;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_selected_flavors
ON journal_entries USING GIN (selected_flavors);
```

3. **Verify the column was added:**

```sql
-- Check if the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
AND column_name = 'selected_flavors';
```

## What this does:

- Adds a `selected_flavors` column of type JSONB to store flavor arrays
- Creates an index for better query performance when searching by flavors
- Allows the app to store and retrieve user flavor preferences for recommendations

## After running this migration:

- Journal entries will be able to save selected flavors
- The recommendation system can use flavor data to suggest cigars
- Existing journal entries will have `null` for selected_flavors (which is fine)
