# 🚀 RevenueCat Webhook Deployment Guide

## 📁 Files Created

- `webhook.js` - Main webhook endpoint with proper Supabase keys
- `webhook-package.json` - Package.json for deployment
- This guide

## 🔑 Supabase Keys Included

The webhook.js file includes:
- **Supabase URL**: `https://lkkbstwmzdbmlfsowwgt.supabase.co`
- **Service Role Key**: Included (but you should set it as environment variable)

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create deployment directory:**
   ```bash
   mkdir revenuecat-webhook
   cd revenuecat-webhook
   cp ../webhook.js index.js
   cp ../webhook-package.json package.json
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set environment variables in Vercel dashboard:**
   - Go to your project in Vercel dashboard
   - Settings → Environment Variables
   - Add: `SUPABASE_SERVICE_ROLE_KEY` = your service role key

5. **Get your webhook URL:**
   ```
   https://your-project.vercel.app/webhook/revenuecat
   ```

### Option 2: Netlify Functions

1. **Create netlify/functions directory:**
   ```bash
   mkdir -p netlify/functions
   ```

2. **Create netlify/functions/revenuecat-webhook.js:**
   ```javascript
   const { createClient } = require('@supabase/supabase-js');
   
   const supabase = createClient(
     'https://lkkbstwmzdbmlfsowwgt.supabase.co',
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );
   
   exports.handler = async (event, context) => {
     // Your webhook logic here
   };
   ```

3. **Deploy to Netlify**

### Option 3: Railway

1. **Create Railway account** at [railway.app](https://railway.app)
2. **Upload webhook files**
3. **Set environment variables**
4. **Deploy**

## 🔧 Environment Variables

Set these in your deployment platform:

```bash
SUPABASE_URL=https://lkkbstwmzdbmlfsowwgt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get your service role key from:**
https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api

## 🧪 Testing Your Webhook

### 1. Health Check
```bash
curl https://your-webhook-url.com/health
```

### 2. Test Endpoint
```bash
curl https://your-webhook-url.com/test
```

### 3. Test Webhook
```bash
curl -X POST https://your-webhook-url.com/webhook/revenuecat \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## ⚙️ Configure RevenueCat Dashboard

1. **Go to RevenueCat Dashboard:**
   https://app.revenuecat.com/

2. **Navigate to:** Project Settings → Webhooks

3. **Add Webhook URL:**
   ```
   https://your-webhook-url.com/webhook/revenuecat
   ```

4. **Enable Events:**
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE

5. **Save Configuration**

## 🔄 How It Works

### Webhook Endpoints

1. **`/webhook/revenuecat`** - Uses database functions (requires `handle_revenuecat_webhook` function)
2. **`/webhook/revenuecat-direct`** - Directly updates database (fallback option)

### Flow

```
User Purchase → RevenueCat → Your Webhook → Supabase Database → App Updates
```

## 🎯 Expected Results

After deployment and configuration:

- ✅ **IAP purchases work** (already working)
- ✅ **Database gets updated** (webhook fixes this)
- ✅ **App shows premium status** (database sync)
- ✅ **Cross-device sync** (webhook handles this)
- ✅ **Automatic renewals** (webhook handles this)

## 🚨 Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is publicly accessible
2. Check RevenueCat dashboard webhook configuration
3. Test webhook endpoint manually

### Database Not Updating
1. Check Supabase service role key is correct
2. Check database functions exist
3. Check webhook logs for errors

### Premium Status Not Updating
1. Check user_subscriptions table
2. Check subscription status is 'active'
3. Check expiration dates are in future

## 📊 Monitoring

### Key Endpoints
- `/health` - Health check with configuration status
- `/test` - Test Supabase connection
- `/webhook/revenuecat` - Main webhook endpoint
- `/webhook/revenuecat-direct` - Direct database update

### Logs to Watch
- Webhook received events
- Database update success/failure
- Supabase connection status

## 🎉 Success!

Once deployed and configured, your RevenueCat integration will be fully functional with automatic database synchronization!
