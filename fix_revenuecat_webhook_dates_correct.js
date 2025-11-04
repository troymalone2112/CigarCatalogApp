// RevenueCat Webhook for Netlify Functions - FIXED VERSION
// This is a Netlify serverless function that RevenueCat can call
// Based on the current webhook with date validation fixes

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with proper keys
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:', {
    SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Netlify function handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  // Health check endpoint
  if (
    event.httpMethod === 'GET' &&
    event.path === '/.netlify/functions/revenuecat-webhook/health'
  ) {
    try {
      console.log('Testing Supabase connection...');
      console.log('URL:', supabaseUrl);
      console.log('Key exists:', !!supabaseServiceKey);

      const { data, error } = await supabase.from('subscription_plans').select('id').limit(1);

      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Database connection failed',
            details: error.message,
          }),
        };
      }

      console.log('✅ Supabase connection test successful');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (error) {
      console.error('❌ Health check error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Health check failed',
          details: error.message,
        }),
      };
    }
  }

  // Handle POST requests (webhook events)
  if (event.httpMethod === 'POST') {
    try {
      console.log('📨 RevenueCat webhook received:', JSON.stringify(event, null, 2));

      const body = JSON.parse(event.body);
      const { api_version, event: webhookEvent } = body;

      if (!webhookEvent) {
        console.error('❌ No event data in webhook payload');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No event data' }),
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
        environment,
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
        environment,
      });

      // FIXED: Convert timestamps with validation and correction
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

        // FIXED: Validate and correct dates if they're too close together
        if (diffMinutes < 5) {
          console.error('🚨 CRITICAL: Subscription dates are too close together!');
          console.error('This indicates a problem with the timestamps from RevenueCat');
          console.error('Purchased:', purchased_at.toISOString());
          console.error('Expiration:', expiration_at.toISOString());
          console.error('Difference:', diffMinutes, 'minutes');

          // Determine expected duration based on product
          const expectedDays =
            product_id.includes('yearly') || product_id.includes('annual') ? 365 : 30;
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
          body: JSON.stringify({ error: 'Invalid date format' }),
        };
      }

      // Try database function first (same as original)
      try {
        console.log('🔄 Attempting to process via database function...');

        const { data, error } = await supabase.rpc('handle_revenuecat_webhook', {
          event_type,
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
          environment,
        });

        if (error) {
          console.error('❌ Database function error:', error);
          throw error;
        }

        console.log('✅ Webhook processed successfully via database function:', data);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data }),
        };
      } catch (dbError) {
        console.log('⚠️ Database function failed, trying direct update:', dbError.message);

        // FIXED: Use corrected dates in fallback
        const purchased_at_iso = purchased_at.toISOString();
        const expiration_at_iso = expiration_at.toISOString();

        // Determine subscription status
        let subscription_status = 'active';
        if (event_type === 'CANCELLATION') {
          subscription_status = 'cancelled';
        } else if (event_type === 'EXPIRATION') {
          subscription_status = 'expired';
        } else if (event_type === 'BILLING_ISSUE') {
          subscription_status = 'past_due';
        }

        // FIXED: Determine correct plan based on product_id
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
            body: JSON.stringify({ error: 'Plan not found' }),
          };
        }

        console.log('📋 Plan found:', planData);

        // Update or insert subscription with corrected dates
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert(
            {
              user_id: app_user_id,
              plan_id: planData.id,
              status: subscription_status,
              subscription_start_date: purchased_at_iso,
              subscription_end_date: expiration_at_iso,
              auto_renew: Boolean(auto_renew_status),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            },
          )
          .select()
          .single();

        if (subscriptionError) {
          console.error('❌ Error updating subscription:', subscriptionError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: subscriptionError.message }),
          };
        }

        console.log('✅ Direct webhook processed successfully:', subscriptionData);

        // Log the webhook event for debugging
        const { error: logError } = await supabase.from('revenuecat_webhook_logs').insert({
          user_id: app_user_id,
          event_type: event_type,
          product_id: product_id,
          purchased_at: purchased_at_iso,
          expiration_at: expiration_at_iso,
          status: subscription_status,
          created_at: new Date().toISOString(),
        });

        if (logError) {
          console.warn('⚠️ Failed to log webhook event:', logError);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: subscriptionData,
            corrected_dates: diffMinutes < 5 ? true : false,
          }),
        };
      }
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  // Default response for unsupported methods
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
