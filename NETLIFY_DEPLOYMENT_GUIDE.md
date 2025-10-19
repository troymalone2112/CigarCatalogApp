# 🚀 Netlify Deployment Guide for RevenueCat Webhook

## 📁 Files Created for Netlify

- `netlify/functions/revenuecat-webhook.js` - Main webhook function
- `netlify/functions/package.json` - Dependencies for Netlify functions
- `netlify.toml` - Netlify configuration
- This deployment guide

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all files to your repository:**
   ```bash
   git add .
   git commit -m "Add RevenueCat webhook for Netlify"
   git push origin main
   ```

### Step 2: Deploy to Netlify

#### Option A: Connect GitHub Repository (Recommended)

1. **Go to [Netlify](https://netlify.com)**
2. **Click "New site from Git"**
3. **Connect your GitHub account**
4. **Select your CigarCatalogApp repository**
5. **Configure build settings:**
   - **Build command:** Leave empty (not needed for functions)
   - **Publish directory:** Leave empty (not needed for functions)
6. **Click "Deploy site"**

#### Option B: Deploy from Local Directory

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Step 3: Set Environment Variables

1. **Go to your Netlify site dashboard**
2. **Navigate to:** Site settings → Environment variables
3. **Add environment variable:**
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your Supabase service role key
   - **Get it from:** https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api

### Step 4: Test Your Webhook

Your webhook will be available at:
```
https://your-site-name.netlify.app/webhook/revenuecat
```

#### Test Endpoints:

1. **Health Check:**
   ```bash
   curl https://your-site-name.netlify.app/webhook/revenuecat/health
   ```

2. **Test Connection:**
   ```bash
   curl https://your-site-name.netlify.app/webhook/revenuecat/test
   ```

3. **Test Webhook:**
   ```bash
   curl -X POST https://your-site-name.netlify.app/webhook/revenuecat \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

## ⚙️ Configure RevenueCat Dashboard

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com/)**
2. **Navigate to:** Project Settings → Webhooks
3. **Add Webhook URL:**
   ```
   https://your-site-name.netlify.app/webhook/revenuecat
   ```
4. **Enable Events:**
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE
5. **Save Configuration**

## 🔧 Netlify Function Features

### Webhook Endpoints

- **`/webhook/revenuecat`** - Main webhook endpoint
- **`/webhook/revenuecat/health`** - Health check
- **`/webhook/revenuecat/test`** - Test Supabase connection

### Function Features

- ✅ **CORS headers** for cross-origin requests
- ✅ **Database function fallback** - tries database function first, falls back to direct update
- ✅ **Comprehensive error handling**
- ✅ **Detailed logging**
- ✅ **Health check endpoints**

## 🧪 Testing Your Deployment

### 1. Check Function Logs

1. **Go to Netlify dashboard**
2. **Navigate to:** Functions → revenuecat-webhook
3. **Check logs for any errors**

### 2. Test with Real Purchase

1. **Make a test purchase in your app**
2. **Check Netlify function logs**
3. **Check your Supabase database for updated subscription**

### 3. Monitor Function Performance

- **Function timeout:** 10 seconds (Netlify default)
- **Memory limit:** 1024MB
- **Cold start time:** ~1-2 seconds

## 🚨 Troubleshooting

### Function Not Working

1. **Check environment variables are set**
2. **Check function logs in Netlify dashboard**
3. **Verify Supabase service role key is correct**

### Database Not Updating

1. **Check if database functions exist** (run `fix_revenuecat_database_functions.sql`)
2. **Check function logs for errors**
3. **Test direct database connection**

### CORS Issues

The function includes CORS headers, but if you have issues:
1. **Check Netlify redirects in netlify.toml**
2. **Verify function is deployed correctly**

## 📊 Monitoring

### Netlify Dashboard

- **Functions tab** - View function logs and performance
- **Deploys tab** - Check deployment status
- **Analytics tab** - Monitor function usage

### Key Metrics to Watch

- ✅ Function execution success rate
- ✅ Function execution time
- ✅ Error rate
- ✅ Database update success

## 🎯 Expected Results

After deployment and configuration:

- ✅ **IAP purchases work** (already working)
- ✅ **Database gets updated** (webhook fixes this)
- ✅ **App shows premium status** (database sync)
- ✅ **Cross-device sync** (webhook handles this)
- ✅ **Automatic renewals** (webhook handles this)

## 🔄 How It Works

### Netlify Function Flow

```
User Purchase → RevenueCat → Netlify Function → Supabase Database → App Updates
```

### Function Logic

1. **Receives webhook from RevenueCat**
2. **Tries database function first** (`handle_revenuecat_webhook`)
3. **Falls back to direct database update** if function fails
4. **Returns success/failure response**

## 🎉 Success!

Once deployed and configured, your RevenueCat integration will be fully functional with automatic database synchronization via Netlify Functions!

### Next Steps

1. **Deploy to Netlify** (5 minutes)
2. **Set environment variables** (2 minutes)
3. **Configure RevenueCat dashboard** (3 minutes)
4. **Test with real purchase** (5 minutes)

**Total time:** ~15 minutes to fully deploy and configure! 🚀