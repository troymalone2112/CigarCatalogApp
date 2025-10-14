// Netlify Function for RevenueCat Webhook
// This handles RevenueCat webhook events and syncs with Supabase

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('📨 RevenueCat webhook received:', JSON.stringify(JSON.parse(event.body), null, 2));
    
    const { api_version, event: webhookEvent } = JSON.parse(event.body);
    
    if (!webhookEvent) {
      console.error('❌ No event data in webhook payload');
      return {
        statusCode: 400,
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
    
    // Call the webhook handler function in Supabase
    const { data, error } = await supabase.rpc('handle_revenuecat_webhook', {
      event_type,
      app_user_id,
      original_app_user_id,
      product_id,
      period_type,
      purchased_at_ms: parseInt(purchased_at_ms),
      expiration_at_ms: parseInt(expiration_at_ms),
      store,
      is_trial_period: Boolean(is_trial_period),
      auto_renew_status: Boolean(auto_renew_status),
      original_transaction_id,
      transaction_id,
      environment
    });
    
    if (error) {
      console.error('❌ Webhook processing error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    console.log('✅ Webhook processed successfully:', data);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
