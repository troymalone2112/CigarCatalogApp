// Script to fix RLS policy for cigars table
// Run this with: node fix_rls_policy.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (matching the app's configuration)
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLSPolicy() {
  try {
    console.log('🔧 Fixing RLS policy for cigars table...');

    // The anon key doesn't have permission to create policies
    // We need to do this through the Supabase dashboard

    console.log('📝 RLS Policy Fix Required:');
    console.log('');
    console.log(
      '🔗 Go to: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/auth/policies',
    );
    console.log('📋 Find the "cigars" table and add this policy:');
    console.log('');
    console.log('Policy Name: "Allow inserts for cigar catalog data"');
    console.log('Operation: INSERT');
    console.log('Target Roles: anon');
    console.log('USING expression: true');
    console.log('');
    console.log('OR run this SQL in the SQL Editor:');
    console.log('');
    console.log('CREATE POLICY "Allow inserts for cigar catalog data" ON cigars');
    console.log('    FOR INSERT TO anon');
    console.log('    WITH CHECK (true);');
    console.log('');
    console.log('✅ After adding the policy, run: npm run migrate-data');
  } catch (error) {
    console.error('💥 RLS fix failed:', error);
  }
}

// Run fix if this file is executed directly
if (require.main === module) {
  fixRLSPolicy();
}

module.exports = { fixRLSPolicy };
