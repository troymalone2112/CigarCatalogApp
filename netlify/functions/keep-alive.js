/**
 * Keep-Alive Function for Supabase
 * 
 * This function performs a lightweight ping to Supabase to keep the connection warm.
 * Can be called:
 * 1. As a scheduled Netlify function (requires Netlify Pro with scheduled functions)
 * 2. Via external cron service (e.g., cron-job.org, EasyCron) that calls this endpoint
 * 3. Manually via HTTP GET request
 * 
 * Recommended frequency: Every 5-10 minutes
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  // Set CORS headers for browser/external requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing Supabase credentials',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Perform a lightweight query to keep connection warm
    // Using a simple query that doesn't require authentication
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      console.error('❌ Keep-alive ping failed:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
          duration_ms: duration,
        }),
      };
    }

    console.log(`✅ Keep-alive ping successful (${duration}ms)`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Supabase connection is warm',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        data_returned: !!data,
      }),
    };
  } catch (error) {
    console.error('❌ Keep-alive error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

