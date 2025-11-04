// Check the latest subscription data to debug the banner issue
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLatestSubscription() {
  try {
    console.log('🔍 Checking latest subscription data...');

    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (subscriptions && subscriptions.length > 0) {
      const sub = subscriptions[0];
      console.log('📊 Latest subscription:');
      console.log('- User ID:', sub.user_id);
      console.log('- Status:', sub.status);
      console.log('- Is Premium:', sub.is_premium);
      console.log('- Auto Renew:', sub.auto_renew);
      console.log('- RevenueCat User ID:', sub.revenuecat_user_id);
      console.log('- Subscription Start:', sub.subscription_start_date);
      console.log('- Subscription End:', sub.subscription_end_date);
      console.log('- Updated At:', sub.updated_at);

      // Check if the subscription should be premium
      const now = new Date();
      const endDate = new Date(sub.subscription_end_date);
      const isActive = endDate > now;

      console.log('\n🔍 Analysis:');
      console.log('- Current time:', now.toISOString());
      console.log('- Subscription ends:', endDate.toISOString());
      console.log('- Should be active:', isActive);
      console.log('- Database says premium:', sub.is_premium);
      console.log('- Status matches:', sub.is_premium === isActive);
    } else {
      console.log('❌ No subscriptions found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestSubscription();

