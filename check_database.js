// Script to check existing database structure
// Run this with: node check_database.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (matching the app's configuration)
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking existing database structure...');
    
    // Check if cigars table exists and get its structure
    const { data: tables, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'cigars' });
    
    if (tableError) {
      console.log('⚠️  Could not get table info via RPC, trying alternative method...');
      
      // Try to query the table directly to see what columns exist
      const { data, error } = await supabase
        .from('cigars')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Cigars table does not exist or is not accessible');
        console.log('Error:', error.message);
        console.log('');
        console.log('📝 You need to create the cigars table first.');
        console.log('🔧 Run: npm run setup-db');
        return;
      } else {
        console.log('✅ Cigars table exists!');
        console.log('📊 Sample data:', data);
      }
    } else {
      console.log('✅ Table info retrieved:', tables);
    }
    
    // Try to get all tables in the public schema
    const { data: allTables, error: allTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!allTablesError && allTables) {
      console.log('📋 All tables in public schema:');
      allTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    // Try to get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'cigars');
    
    if (!columnsError && columns) {
      console.log('📊 Cigars table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Database check failed:', error);
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
