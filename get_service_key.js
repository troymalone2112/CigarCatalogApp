// Script to help get the service role key
// Run this with: node get_service_key.js

console.log('🔑 Getting Supabase Service Role Key:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api');
console.log('');
console.log('2. Scroll down to "Project API keys"');
console.log('');
console.log('3. Copy the "service_role" key (NOT the anon key)');
console.log('');
console.log('4. It will look something like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('');
console.log('5. Add it to your .env file as:');
console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
console.log('');
console.log('6. Then run: npm run migrate-data');
console.log('');
console.log('⚠️  IMPORTANT: Keep the service role key secret! It bypasses all security policies.');
