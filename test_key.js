// Test script to verify service role key loading
require('dotenv').config();

console.log('🔍 Testing environment variable loading...');
console.log('');

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseKey);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

if (supabaseKey) {
  console.log('Key starts with:', supabaseKey.substring(0, 20) + '...');
  console.log('Contains "anon":', supabaseKey.includes('anon'));
  console.log('Contains "service":', supabaseKey.includes('service'));
} else {
  console.log('❌ No service role key found in .env file');
  console.log('');
  console.log('📝 Please add to your .env file:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
}
