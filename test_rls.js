const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  console.log('🔍 Testing Row Level Security...\n');

  try {
    // Test 1: Try to access tables without authentication (should fail or return empty)
    console.log('1. Testing unauthenticated access...');
    
    const { data: profilesUnauth, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('   Profiles (unauth):', profilesUnauth?.length || 0, 'rows');
    if (profilesError) console.log('   Error:', profilesError.message);

    // Test 2: Try to access subscription plans (should work for everyone)
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');
    
    console.log('   Subscription plans:', plans?.length || 0, 'rows');
    if (plansError) console.log('   Plans error:', plansError.message);

    // Test 3: Create a test user and authenticate
    console.log('\n2. Testing with authentication...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    console.log('   Creating test user:', testEmail);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.log('   Signup error:', signUpError.message);
      
      // Try to sign in instead (user might already exist)
      console.log('   Trying to sign in...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        console.log('   Sign in error:', signInError.message);
        return;
      }
      
      console.log('   ✅ Signed in successfully');
    } else {
      console.log('   ✅ User created successfully');
    }

    // Wait a moment for the user to be fully created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Try authenticated requests
    console.log('\n3. Testing authenticated access...');
    
    const { data: profilesAuth, error: profilesAuthError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('   Profiles (auth):', profilesAuth?.length || 0, 'rows');
    if (profilesAuthError) console.log('   Error:', profilesAuthError.message);

    // Test 5: Try to access user's own subscription
    const { data: userSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*');
    
    console.log('   User subscriptions:', userSub?.length || 0, 'rows');
    if (subError) console.log('   Subscription error:', subError.message);

    // Test 6: Test the helper functions
    console.log('\n4. Testing helper functions...');
    
    const { data: testResult, error: testError } = await supabase
      .rpc('test_subscription_system');
    
    if (testError) {
      console.log('   Function test error:', testError.message);
    } else {
      console.log('   Function test result:');
      console.log('   ' + testResult.replace(/\n/g, '\n   '));
    }

    console.log('\n✅ RLS testing completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testRLS();










