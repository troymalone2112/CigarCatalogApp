// RevenueCat Webhook for Netlify Functions - CORRECTED VERSION
// This is a Netlify serverless function that RevenueCat can call
// Fixed: Date validation and RevenueCat user ID syncing

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
      console.log('Testing Supabase connection...');
      console.log('URL:', supabaseUrl);
      console.log('Key exists:', !!supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Database connection failed',
            details: error.message 
          })
        };
      }
      
      console.log('✅ Supabase connection test successful');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString()
        })
      };
    } catch (error) {
      console.error('❌ Health check error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Health check failed',
          details: error.message 
        })
      };
    }
  }

  // Main webhook handler
  if (event.httpMethod === 'POST') {
    try {
      const webhookData = JSON.parse(event.body);
      console.log('📨 RevenueCat webhook received:', JSON.stringify(webhookData, null, 2));
      
      // Log the full webhook event to a separate table for debugging
      await supabase.from('revenuecat_webhook_events').insert({
        event_data: webhookData,
        received_at: new Date().toISOString()
      });

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
          body: JSON.stringify({ success: true, message: 'Test webhook received' })
        };
      }

      // Validate timestamps
      if (!purchased_at_ms || !expiration_at_ms) {
        console.error('❌ Missing purchased_at_ms or expiration_at_ms');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing purchased_at_ms or expiration_at_ms' })
        };
      }

      let final_purchased_at_ms = parseInt(purchased_at_ms);
      let final_expiration_at_ms = parseInt(expiration_at_ms);

      if (isNaN(final_purchased_at_ms) || isNaN(final_expiration_at_ms)) {
        console.error('❌ Invalid date format for purchased_at_ms or expiration_at_ms');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid date format' })
        };
      }

      // Date validation and correction logic
      const purchasedAtDate = new Date(final_purchased_at_ms);
      let expirationAtDate = new Date(final_expiration_at_ms);
      const timeDifferenceMinutes = (expirationAtDate.getTime() - purchasedAtDate.getTime()) / (1000 * 60);

      // Determine expected duration based on product_id
      let expectedDurationDays = 0;
      let subscription_plan_name = 'Premium Monthly'; // Default

      if (product_id.includes('monthly') || product_id === '$rc_monthly') {
        expectedDurationDays = 30;
        subscription_plan_name = 'Premium Monthly';
      } else if (product_id.includes('yearly') || product_id.includes('annual') || product_id === '$rc_annual') {
        expectedDurationDays = 365;
        subscription_plan_name = 'Premium Yearly';
      }

      // If the time difference is suspiciously short (e.g., less than 29 days for a monthly plan)
      // and an expected duration is defined, correct the expiration date.
      if (expectedDurationDays > 0 && timeDifferenceMinutes < (expectedDurationDays * 24 * 60 - (24 * 60))) { // Less than expected duration minus 1 day
        console.warn(`⚠️ Detected problematic subscription dates for user ${app_user_id}. Original expiration: ${expirationAtDate.toISOString()}. Recalculating.`);
        expirationAtDate = new Date(purchasedAtDate.getTime() + (expectedDurationDays * 24 * 60 * 60 * 1000));
        final_expiration_at_ms = expirationAtDate.getTime();
        console.log(`✅ Corrected expiration date to: ${expirationAtDate.toISOString()} (based on ${expectedDurationDays} days)`);
      }

      // Try the database function first
      try {
        console.log('🔄 Attempting to process via database function...');
        
        const { data, error } = await supabase.rpc('handle_revenuecat_webhook', {
          event_type,
          app_user_id,
          original_app_user_id,
          product_id,
          period_type,
          purchased_at_ms: final_purchased_at_ms, // Use corrected timestamp
          expiration_at_ms: final_expiration_at_ms, // Use corrected timestamp
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
          body: JSON.stringify({ success: true, data, corrected_dates: expectedDurationDays > 0 && timeDifferenceMinutes < (expectedDurationDays * 24 * 60 - (24 * 60)) })
        };
        
      } catch (dbError) {
        console.log('⚠️ Database function failed, trying direct update:', dbError.message);
        
        // Fallback: Direct database update
        const purchased_at = new Date(final_purchased_at_ms);
        const expiration_at = new Date(final_expiration_at_ms);
        
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
          .eq('name', subscription_plan_name) // Use determined plan name
          .single();
        
        if (planError) {
          console.error('❌ Error getting plan:', planError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Plan not found' })
          };
        }
        
        // Update or insert subscription with RevenueCat user ID
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: app_user_id,
            plan_id: planData.id,
            status: subscription_status,
            subscription_start_date: purchased_at.toISOString(),
            subscription_end_date: expiration_at.toISOString(),
            auto_renew: Boolean(auto_renew_status),
            updated_at: new Date().toISOString(),
            revenuecat_user_id: app_user_id, // FIXED: Store RevenueCat user ID
            is_premium: (subscription_status === 'active' || subscription_status === 'cancelled') && expiration_at > new Date()
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
          body: JSON.stringify({ success: true, data: subscriptionData, corrected_dates: expectedDurationDays > 0 && timeDifferenceMinutes < (expectedDurationDays * 24 * 60 - (24 * 60)) })
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