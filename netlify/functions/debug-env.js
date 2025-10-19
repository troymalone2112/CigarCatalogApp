// Debug environment variables for Netlify Functions
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Debug environment variables
  const envVars = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    // Show first 10 characters of the key if it exists
    KEY_PREFIX: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
      process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 
      'NOT SET'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Environment variables debug',
      environment: envVars,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
      timestamp: new Date().toISOString()
    })
  };
};
