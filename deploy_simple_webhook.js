// Simple webhook deployment test
const https = require('https');

// Test if webhook URL exists by trying a simple request
const testUrls = [
  'https://cigar-catalog-webhook.netlify.app',
  'https://cigarcatalogapp.netlify.app',
  'https://cigar-webhook.netlify.app'
];

console.log('🔍 Testing potential webhook URLs...');

testUrls.forEach((url, index) => {
  setTimeout(() => {
    const req = https.get(url + '/health', (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url} - Error: ${err.code}`);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${url} - Timeout`);
      req.destroy();
    });
  }, index * 1000);
});

