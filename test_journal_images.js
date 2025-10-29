// Test script to check journal entry image functionality
// Run this to verify that images are being saved and retrieved correctly

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJournalImages() {
  try {
    console.log('🔍 Testing journal entry image functionality...\n');
    
    // Check if image_url column exists
    console.log('1. Checking if image_url column exists in journal_entries table...');
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'journal_entries')
      .eq('column_name', 'image_url');
    
    if (columnError) {
      console.error('❌ Error checking columns:', columnError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ image_url column exists');
    } else {
      console.log('❌ image_url column does not exist - you need to run the migration');
      console.log('   Run this SQL in your Supabase dashboard:');
      console.log('   ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS image_url TEXT;');
      return;
    }
    
    // Check existing journal entries
    console.log('\n2. Checking existing journal entries...');
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, image_url, photos, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (entriesError) {
      console.error('❌ Error fetching journal entries:', entriesError);
      return;
    }
    
    console.log(`Found ${entries.length} recent journal entries:`);
    entries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ID: ${entry.id}`);
      console.log(`     Image URL: ${entry.image_url || 'None'}`);
      console.log(`     Photos: ${entry.photos ? JSON.parse(entry.photos).length + ' photos' : 'None'}`);
      console.log(`     Created: ${entry.created_at}`);
      console.log('');
    });
    
    // Check for entries with images
    const entriesWithImages = entries.filter(entry => entry.image_url || entry.photos);
    console.log(`📸 ${entriesWithImages.length} entries have images`);
    
    if (entriesWithImages.length === 0) {
      console.log('💡 No entries with images found. Try creating a new journal entry with cigar recognition.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJournalImages();



