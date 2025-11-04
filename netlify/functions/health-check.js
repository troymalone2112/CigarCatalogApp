// Health check endpoint for Netlify function
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      function: 'health-check',
    }),
  };
};
