const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

if (!supabaseKey || supabaseKey.includes('anon')) {
  console.error('❌ Service Role Key Required!');
  console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSelectedFlavorsColumn() {
  try {
    console.log('🔄 Adding selected_flavors column to journal_entries...');

    // First, let's check the current table structure
    console.log('📋 Checking current table structure...');

    // Add the selected_flavors column using raw SQL
    const { error } = await supabase.from('journal_entries').select('id').limit(1);

    if (error && error.code === 'PGRST204') {
      console.log('❌ Table journal_entries does not exist or has different structure');
      console.log('🔍 Error:', error.message);
      return;
    }

    // Try to add the column using a direct SQL query
    console.log('🔧 Attempting to add selected_flavors column...');

    // Use the REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        sql: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 
                  FROM information_schema.columns 
                  WHERE table_name = 'journal_entries' 
                  AND column_name = 'selected_flavors'
              ) THEN
                  ALTER TABLE journal_entries 
                  ADD COLUMN selected_flavors JSONB;
                  RAISE NOTICE 'Added selected_flavors column';
              ELSE
                  RAISE NOTICE 'selected_flavors column already exists';
              END IF;
          END $$;
        `,
      }),
    });

    if (response.ok) {
      console.log('✅ Migration completed successfully!');
      console.log('🎉 selected_flavors column is now available');
    } else {
      const errorText = await response.text();
      console.log('⚠️  Migration response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.log('💡 You may need to run this SQL manually in your Supabase dashboard:');
    console.log('');
    console.log('ALTER TABLE journal_entries ADD COLUMN selected_flavors JSONB;');
    console.log('');
    console.log(
      'CREATE INDEX IF NOT EXISTS idx_journal_entries_selected_flavors ON journal_entries USING GIN (selected_flavors);',
    );
  }
}

// Run the migration
addSelectedFlavorsColumn();
