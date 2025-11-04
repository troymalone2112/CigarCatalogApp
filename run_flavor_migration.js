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

async function runMigration() {
  try {
    console.log('🔄 Running selected_flavors migration...');

    // Read the migration SQL file
    const fs = require('fs');
    const path = require('path');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add_selected_flavors_column.sql'),
      'utf8',
    );

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('🎉 selected_flavors column is now available for storing flavor profiles');
  } catch (error) {
    console.error('❌ Error running migration:', error);
  }
}

// Run the migration
runMigration();
