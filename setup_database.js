// Database setup script to create the cigars table
// Run this with: node setup_database.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (matching the app's configuration)
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database schema...');
    
    // First, let's check if the cigars table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'cigars');
    
    if (tableError) {
      console.log('⚠️  Could not check existing tables, proceeding with setup...');
    } else if (tables && tables.length > 0) {
      console.log('✅ Cigars table already exists!');
      return;
    }
    
    console.log('📝 Note: The database schema needs to be created in Supabase Dashboard.');
    console.log('🔧 Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Create the cigars table');
    console.log('CREATE TABLE IF NOT EXISTS cigars (');
    console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
    console.log('  brand_name TEXT NOT NULL,');
    console.log('  cigar_name TEXT NOT NULL,');
    console.log('  full_name TEXT GENERATED ALWAYS AS (brand_name || \' \' || cigar_name) STORED,');
    console.log('  rating INTEGER NOT NULL CHECK (rating >= 90 AND rating <= 100),');
    console.log('  price_usd DECIMAL(10,2) NOT NULL,');
    console.log('  strength TEXT NOT NULL CHECK (strength IN (\'Mild\', \'Medium\', \'Medium-Full\', \'Full\')),');
    console.log('  description TEXT NOT NULL,');
    console.log('  detail_url TEXT,');
    console.log('  image_url TEXT,');
    console.log('  image_path TEXT,');
    console.log('  year_listed INTEGER,');
    console.log('  rank_in_year INTEGER,');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('-- Create indexes for efficient searching');
    console.log('CREATE INDEX IF NOT EXISTS idx_cigars_brand ON cigars(brand_name);');
    console.log('CREATE INDEX IF NOT EXISTS idx_cigars_rating ON cigars(rating DESC);');
    console.log('CREATE INDEX IF NOT EXISTS idx_cigars_price ON cigars(price_usd);');
    console.log('CREATE INDEX IF NOT EXISTS idx_cigars_strength ON cigars(strength);');
    console.log('CREATE INDEX IF NOT EXISTS idx_cigars_year ON cigars(year_listed);');
    console.log('');
    console.log('-- Enable Row Level Security');
    console.log('ALTER TABLE cigars ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Create policy for public read access');
    console.log('CREATE POLICY "Allow public read access to cigars" ON cigars FOR SELECT USING (true);');
    console.log('');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/sql');
    console.log('📋 Copy and paste the SQL above into the SQL Editor');
    console.log('▶️  Click "Run" to create the table');
    console.log('');
    console.log('✅ After running the SQL, you can run: npm run migrate-data');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
