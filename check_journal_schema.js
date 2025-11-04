/**
 * Check Journal Entries Database Schema
 * This script will help us understand the actual database structure
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJournalSchema() {
  console.log('🔍 Checking journal_entries table schema...\n');

  try {
    // First, let's see what columns exist
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'journal_entries')
      .eq('table_schema', 'public');

    if (columnError) {
      console.error('❌ Error checking columns:', columnError);
      return;
    }

    console.log('📋 Available columns in journal_entries:');
    columns.forEach((col) => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Now let's try to get a sample entry to see what data looks like
    console.log('\n🔍 Sample journal entry data:');
    const { data: sample, error: sampleError } = await supabase
      .from('journal_entries')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error getting sample data:', sampleError);
    } else if (sample && sample.length > 0) {
      console.log('📄 Sample entry fields:');
      Object.keys(sample[0]).forEach((key) => {
        const value = sample[0][key];
        console.log(`   ${key}: ${typeof value} = ${value}`);
      });
    } else {
      console.log('📄 No journal entries found in database');
    }
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

// Run the check
checkJournalSchema();

