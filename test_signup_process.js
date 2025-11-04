const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupProcess() {
  console.log('🧪 Testing signup process...');

  try {
    // Test the signup process
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testFullName = 'Test User';

    console.log('📝 Attempting signup with:');
    console.log('  Email:', testEmail);
    console.log('  Full Name:', testFullName);

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
        },
      },
    });

    if (error) {
      console.log('❌ Signup failed:', error);
      return;
    }

    console.log('✅ Signup successful!');
    console.log('  User ID:', data.user?.id);
    console.log('  Email:', data.user?.email);
    console.log('  Metadata:', data.user?.user_metadata);

    // Wait a moment for the trigger to execute
    console.log('⏳ Waiting for trigger to execute...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if profile was created
    console.log('🔍 Checking if profile was created...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile not found:', profileError);
    } else {
      console.log('✅ Profile created successfully!');
      console.log('  Profile ID:', profile.id);
      console.log('  Email:', profile.email);
      console.log('  Full Name:', profile.full_name);
    }

    // Clean up - delete the test user
    console.log('🧹 Cleaning up test user...');
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSignupProcess();
