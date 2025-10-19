// RevenueCat Webhook for Netlify Functions
// This is a Netlify serverless function that RevenueCat can call

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with proper keys
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:', {
    SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET'
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
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  // Health check endpoint
  if (event.httpMethod === 'GET' && event.path === '/.netlify/functions/revenuecat-webhook/health') {
    try {
      // First, let's test if we can create the client at all
      console.log('Testing Supabase connection...');
      console.log('URL:', supabaseUrl);
      console.log('Key exists:', !!supabaseServiceKey);
      
      // Test with a very basic query
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id')
        .limit(1);
      
      console.log('Query result:', { data, error });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          supabase_url: supabaseUrl,
          service_key_configured: !!supabaseServiceKey,
          supabase_connection: !error,
          environment_variables: {
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
            SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET'
          },
          error_details: error ? error.message : null,
          error_code: error ? error.code : null,
          data_returned: data ? 'YES' : 'NO',
          query_test: 'subscription_plans table',
          debug_info: {
            url_length: supabaseUrl ? supabaseUrl.length : 0,
            key_length: supabaseServiceKey ? supabaseServiceKey.length : 0
          }
        })
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          error_stack: error.stack,
          supabase_url: supabaseUrl,
          service_key_configured: !!supabaseServiceKey,
          environment_variables: {
            SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
            SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET'
          }
        })
      };
    }
  }

  // Test endpoint
  if (event.httpMethod === 'GET' && event.path === '/.netlify/functions/revenuecat-webhook/test') {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Supabase connection working',
          supabase_url: supabaseUrl
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Main webhook handler
  if (event.httpMethod === 'POST') {
    try {
      const webhookData = JSON.parse(event.body);
      console.log('📨 RevenueCat webhook received:', JSON.stringify(webhookData, null, 2));
      
      const { api_version, event: eventData } = webhookData;
      
      if (!eventData) {
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
      } = eventData;
      
      console.log('🔍 Event details:', {
        event_type,
        app_user_id,
        original_app_user_id,
        product_id,
        store,
        environment
      });
      
      console.log(`🔄 Processing ${event_type} for user ${app_user_id}`);
      
      // Handle test events
      if (event_type === 'TEST') {
        console.log('✅ Test webhook received - returning success');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Test webhook received successfully',
            event_type: 'TEST'
          })
        };
      }
      
      // Try the database function first
      try {
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
          console.error('❌ Database function error:', error);
          throw error;
        }
        
        console.log('✅ Webhook processed successfully via database function:', data);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data })
        };
        
      } catch (dbError) {
        console.log('⚠️ Database function failed, trying direct update:', dbError.message);
        
        // Fallback: Direct database update
        const purchased_at = new Date(parseInt(purchased_at_ms));
        const expiration_at = new Date(parseInt(expiration_at_ms));
        
        // Determine subscription status
        let subscription_status = 'active';
        if (event_type === 'CANCELLATION') {
          subscription_status = 'cancelled';
        } else if (event_type === 'EXPIRATION') {
          subscription_status = 'expired';
        } else if (event_type === 'BILLING_ISSUE') {
          subscription_status = 'past_due';
        }
        
        // Get the premium plan ID
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Premium Monthly')
          .single();
        
        if (planError) {
          console.error('❌ Error getting plan:', planError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Plan not found' })
          };
        }
        
        // Update or insert subscription
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
            body: JSON.stringify({ error: subscriptionError.message })
          };
        }
        
        console.log('✅ Direct webhook processed successfully:', subscriptionData);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: subscriptionData })
        };
      }
      
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // Default response for unsupported methods
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};