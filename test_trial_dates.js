const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTrialDates() {
  console.log('🧪 Testing trial date creation...');

  try {
    // Test the signup process
    const testEmail = `test-trial-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testFullName = 'Test Trial User';

    console.log('📝 Attempting signup with:');
    console.log('  Email:', testEmail);
    console.log('  Full Name:', testFullName);
    console.log('  User Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    await new Promise((resolve) => setTimeout(resolve, 3000));

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

    // Check if trial subscription was created
    console.log('🔍 Checking if trial subscription was created...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (subError) {
      console.log('❌ Trial subscription not found:', subError);
    } else {
      console.log('✅ Trial subscription created successfully!');
      console.log('  User ID:', subscription.user_id);
      console.log('  Status:', subscription.status);
      console.log('  Trial Start:', subscription.trial_start_date);
      console.log('  Trial End:', subscription.trial_end_date);

      const now = new Date();
      const trialStart = new Date(subscription.trial_start_date);
      const trialEnd = new Date(subscription.trial_end_date);
      const isActive = trialEnd > now;

      console.log('  Current Time:', now.toISOString());
      console.log('  Trial Active:', isActive);
      console.log('  Days Remaining:', Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    }

    // Clean up - delete the test user
    console.log('🧹 Cleaning up test user...');
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTrialDates();
