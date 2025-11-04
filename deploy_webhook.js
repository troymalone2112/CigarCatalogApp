// Deploy RevenueCat Webhook
// This script helps you deploy the webhook to various platforms

const fs = require('fs');
const path = require('path');

console.log('🚀 RevenueCat Webhook Deployment Guide');
console.log('=====================================\n');

console.log('📋 Choose your deployment platform:\n');

console.log('1. 🟢 Vercel (Recommended - Easiest)');
console.log('   - Free hosting');
console.log('   - Automatic HTTPS');
console.log('   - Easy environment variables');
console.log('   - Command: vercel --prod\n');

console.log('2. 🟡 Netlify Functions');
console.log('   - Free hosting');
console.log('   - Serverless functions');
console.log('   - Command: netlify deploy --prod\n');

console.log('3. 🔵 Railway');
console.log('   - Simple deployment');
console.log('   - Good for Node.js apps');
console.log('   - Command: railway deploy\n');

console.log('4. 🟠 Heroku');
console.log('   - Traditional hosting');
console.log('   - Command: git push heroku main\n');

console.log('📁 Files to deploy:');
console.log('   - revenuecat_webhook_endpoint.js (rename to index.js)');
console.log('   - webhook_package.json (rename to package.json)');
console.log('   - .env file with environment variables\n');

console.log('🔑 Required Environment Variables:');
console.log('   - SUPABASE_URL=https://lkkbstwmzdbmlfsowwgt.supabase.co');
console.log('   - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');

console.log('🌐 After deployment, your webhook URL will be:');
console.log('   https://your-project.vercel.app/webhook/revenuecat');
console.log('   (or similar for other platforms)\n');

console.log('⚙️ Next step: Configure this URL in RevenueCat dashboard:');
console.log('   https://app.revenuecat.com/ → Project Settings → Webhooks\n');

// Create deployment files
console.log('📝 Creating deployment files...\n');

// Create index.js for Vercel
const webhookCode = fs.readFileSync('revenuecat_webhook_endpoint.js', 'utf8');
fs.writeFileSync('webhook-index.js', webhookCode);
console.log('✅ Created webhook-index.js (rename to index.js for Vercel)');

// Create package.json for webhook
const packageJson = {
  name: 'revenuecat-webhook',
  version: '1.0.0',
  main: 'index.js',
  scripts: {
    start: 'node index.js',
  },
  dependencies: {
    express: '^4.18.2',
    '@supabase/supabase-js': '^2.39.3',
  },
};

fs.writeFileSync('webhook-package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Created webhook-package.json (rename to package.json)');

// Create .env template
const envTemplate = `# RevenueCat Webhook Environment Variables
SUPABASE_URL=https://lkkbstwmzdbmlfsowwgt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Get your service role key from:
# https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api`;

fs.writeFileSync('webhook.env', envTemplate);
console.log('✅ Created webhook.env (copy to .env in your deployment)');

console.log('\n🎯 Quick Start Commands:\n');

console.log('For Vercel:');
console.log('1. mkdir revenuecat-webhook && cd revenuecat-webhook');
console.log('2. cp ../webhook-index.js index.js');
console.log('3. cp ../webhook-package.json package.json');
console.log('4. vercel --prod');
console.log('5. Set environment variables in Vercel dashboard\n');

console.log('For Netlify:');
console.log('1. mkdir netlify/functions');
console.log('2. cp revenuecat_webhook_endpoint.js netlify/functions/revenuecat-webhook.js');
console.log('3. netlify deploy --prod\n');

console.log('🔧 After deployment:');
console.log('1. Copy your webhook URL');
console.log('2. Go to RevenueCat dashboard');
console.log('3. Add webhook URL in Project Settings → Webhooks');
console.log('4. Enable all events (INITIAL_PURCHASE, RENEWAL, etc.)');
console.log('5. Test with a purchase in your app\n');

console.log('✅ Your RevenueCat integration will be fully functional!');
