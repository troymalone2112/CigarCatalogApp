// Test the banner logic to see why it's still showing
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBannerLogic() {
  try {
    console.log('🔍 Testing banner logic...');
    
    // Get the most recent subscription
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error || !subscriptions || subscriptions.length === 0) {
      console.error('❌ No subscriptions found:', error);
      return;
    }
    
    const sub = subscriptions[0];
    console.log('📊 Current subscription data:');
    console.log('- Status:', sub.status);
    console.log('- Is Premium (DB):', sub.is_premium);
    console.log('- Auto Renew:', sub.auto_renew);
    console.log('- Subscription End:', sub.subscription_end_date);
    console.log('- Updated At:', sub.updated_at);
    
    // Simulate the app's subscription status logic
    const now = new Date();
    let hasAccess = false;
    let isTrialActive = false;
    let isPremium = false;
    let daysRemaining = 0;
    
    // Use the is_premium field from the database if available
    if (sub.is_premium !== undefined) {
      isPremium = sub.is_premium;
      hasAccess = isPremium;
      console.log('✅ Using is_premium from database:', isPremium);
    } else {
      console.log('⚠️ No is_premium field found, falling back to calculation');
      // Fallback logic
      if (sub.status === 'trial') {
        const trialEndDate = new Date(sub.trial_end_date);
        isTrialActive = trialEndDate > now;
        hasAccess = isTrialActive;
      } else if (sub.status === 'active') {
        const subscriptionEndDate = new Date(sub.subscription_end_date || '');
        isPremium = subscriptionEndDate > now;
        hasAccess = isPremium;
      }
    }
    
    // Calculate days remaining if premium
    if (isPremium && sub.subscription_end_date) {
      const subscriptionEndDate = new Date(sub.subscription_end_date);
      daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    console.log('\n🎯 Banner Logic Test:');
    console.log('- Has Access:', hasAccess);
    console.log('- Is Trial Active:', isTrialActive);
    console.log('- Is Premium:', isPremium);
    console.log('- Days Remaining:', daysRemaining);
    
    // Test banner logic
    if (isPremium) {
      console.log('✅ Banner should be HIDDEN (user is premium)');
    } else {
      console.log('❌ Banner will be SHOWN (user is not premium)');
      
      if (isTrialActive || (hasAccess && !isPremium)) {
        console.log('📢 Banner will show because:');
        if (isTrialActive) console.log('  - Trial is active');
        if (hasAccess && !isPremium) console.log('  - Has access but not premium');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBannerLogic();

