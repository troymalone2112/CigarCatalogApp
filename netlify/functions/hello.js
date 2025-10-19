// Simple test function for Netlify
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from Netlify Functions!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
    })
  };
};
