// Fixed RevenueCat webhook with proper date handling and logging

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fixed webhook handler with proper date processing
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('📨 RevenueCat webhook received:', JSON.stringify(event, null, 2));
    
    const body = JSON.parse(event.body);
    const { api_version, event: webhookEvent } = body;
    
    if (!webhookEvent) {
      console.error('❌ No event data in webhook payload');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No event data' })
      };
    }
    
    const {
      type: event_type,
      app_user_id,
      original_app_user_id,
      product_id,
      period_type,
      purchased_at_ms,
      expiration_at_ms,
      store,
      is_trial_period,
      auto_renew_status,
      original_transaction_id,
      transaction_id,
      environment
    } = webhookEvent;
    
    console.log(`🔄 Processing ${event_type} for user ${app_user_id}`);
    console.log('📊 Event details:', {
      product_id,
      period_type,
      purchased_at_ms,
      expiration_at_ms,
      store,
      is_trial_period,
      auto_renew_status,
      environment
    });
    
    // Convert timestamps with proper validation
    let purchased_at, expiration_at;
    
    try {
      purchased_at = new Date(parseInt(purchased_at_ms));
      expiration_at = new Date(parseInt(expiration_at_ms));
      
      console.log('📅 Converted dates:');
      console.log('Purchased at:', purchased_at.toISOString());
      console.log('Expiration at:', expiration_at.toISOString());
      
      // Calculate and log the difference
      const diffMs = expiration_at.getTime() - purchased_at.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      console.log('⏰ Time difference:');
      console.log('Minutes:', diffMinutes);
      console.log('Days:', diffDays);
      
      // Validate the dates make sense
      if (diffMinutes < 5) {
        console.error('🚨 CRITICAL: Subscription dates are too close together!');
        console.error('This indicates a problem with the timestamps from RevenueCat');
        console.error('Purchased:', purchased_at.toISOString());
        console.error('Expiration:', expiration_at.toISOString());
        console.error('Difference:', diffMinutes, 'minutes');
        
        // For monthly subscriptions, expect ~30 days
        // For yearly subscriptions, expect ~365 days
        const expectedDays = product_id.includes('yearly') ? 365 : 30;
        const expectedMs = expectedDays * 24 * 60 * 60 * 1000;
        
        console.log('🔧 Attempting to fix dates...');
        console.log('Expected duration:', expectedDays, 'days');
        
        // Recalculate expiration based on purchase date + expected duration
        expiration_at = new Date(purchased_at.getTime() + expectedMs);
        console.log('🔧 Corrected expiration:', expiration_at.toISOString());
        
        // Log the correction
        const correctedDiffMs = expiration_at.getTime() - purchased_at.getTime();
        const correctedDiffDays = Math.round(correctedDiffMs / (1000 * 60 * 60 * 24));
        console.log('✅ Corrected difference:', correctedDiffDays, 'days');
      }
      
    } catch (dateError) {
      console.error('❌ Error parsing dates:', dateError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid date format' })
      };
    }
    
    // Determine subscription status
    let subscription_status = 'active';
    if (event_type === 'CANCELLATION') {
      subscription_status = 'cancelled';
    } else if (event_type === 'EXPIRATION') {
      subscription_status = 'expired';
    } else if (event_type === 'BILLING_ISSUE') {
      subscription_status = 'past_due';
    }
    
    // Determine the correct plan based on product_id
    let planName = 'Premium Monthly'; // Default
    if (product_id.includes('yearly') || product_id.includes('annual')) {
      planName = 'Premium Yearly';
    } else if (product_id.includes('monthly')) {
      planName = 'Premium Monthly';
    }
    
    console.log('📋 Plan determined:', planName);
    
    // Get the premium plan ID
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, price_monthly, price_yearly')
      .eq('name', planName)
      .single();
    
    if (planError) {
      console.error('❌ Error getting plan:', planError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Plan not found' })
      };
    }
    
    console.log('📋 Plan found:', planData);
    
    // Update or insert subscription with corrected dates
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: app_user_id,
        plan_id: planData.id,
        status: subscription_status,
        subscription_start_date: purchased_at.toISOString(),
        subscription_end_date: expiration_at.toISOString(),
        auto_renew: Boolean(auto_renew_status),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ Error updating subscription:', subscriptionError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update subscription' })
      };
    }
    
    console.log('✅ Subscription updated successfully:', subscriptionData);
    
    // Log the webhook event for debugging
    const { error: logError } = await supabase
      .from('revenuecat_webhook_logs')
      .insert({
        user_id: app_user_id,
        event_type: event_type,
        product_id: product_id,
        purchased_at: purchased_at.toISOString(),
        expiration_at: expiration_at.toISOString(),
        status: subscription_status,
        created_at: new Date().toISOString()
      });
    
    if (logError) {
      console.warn('⚠️ Failed to log webhook event:', logError);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Subscription updated successfully',
        subscription: subscriptionData
      })
    };
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
