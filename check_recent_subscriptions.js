const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRecentSubscriptions() {
  try {
    console.log('🔍 Checking recent subscriptions...');

    // Get recent subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select(
        `
        *,
        subscription_plans (
          name,
          price_monthly,
          price_yearly
        )
      `,
      )
      .order('updated_at', { ascending: false })
      .limit(10);

    if (subError) {
      console.error('❌ Error getting subscriptions:', subError);
      return;
    }

    console.log('📊 Recent Subscriptions:');
    subscriptions.forEach((sub, index) => {
      console.log(`\n--- Subscription ${index + 1} ---`);
      console.log('Status:', sub.status);
      console.log('Trial Start:', sub.trial_start_date);
      console.log('Trial End:', sub.trial_end_date);
      console.log('Subscription Start:', sub.subscription_start_date);
      console.log('Subscription End:', sub.subscription_end_date);
      console.log('Plan:', sub.subscription_plans?.name);
      console.log('Updated At:', sub.updated_at);

      // Calculate the difference for active subscriptions
      if (sub.status === 'active' && sub.subscription_start_date && sub.subscription_end_date) {
        const start = new Date(sub.subscription_start_date);
        const end = new Date(sub.subscription_end_date);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        console.log('⏰ Time Difference:');
        console.log('Minutes:', diffMinutes);
        console.log('Days:', diffDays);

        if (diffMinutes < 10) {
          console.log('🚨 ISSUE: Subscription dates are too close together!');
        }
      }
    });

    // Check for any RevenueCat webhook logs
    console.log('\n🔍 Checking RevenueCat webhook logs...');
    const { data: webhookData, error: webhookError } = await supabase
      .from('revenuecat_webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!webhookError && webhookData && webhookData.length > 0) {
      console.log('📝 Recent webhook logs:');
      webhookData.forEach((log, index) => {
        console.log(`\n--- Webhook Log ${index + 1} ---`);
        console.log('Event Type:', log.event_type);
        console.log('User ID:', log.user_id);
        console.log('Product ID:', log.product_id);
        console.log('Expiration At:', log.expiration_at);
        console.log('Created At:', log.created_at);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRecentSubscriptions();
