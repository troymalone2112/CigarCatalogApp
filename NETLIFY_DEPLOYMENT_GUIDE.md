# Netlify Deployment Guide for RevenueCat Webhook

This guide walks you through deploying your RevenueCat webhook to Netlify step-by-step.

## 📋 Prerequisites

1. ✅ Netlify account (free tier is fine)
2. ✅ Git repository (GitHub, GitLab, or Bitbucket)
3. ✅ Supabase project with webhook functions deployed

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Create a new directory** for your webhook project:
   ```bash
   mkdir cigar-webhook
   cd cigar-webhook
   ```

2. **Copy the webhook files** to this directory:
   ```bash
   # Copy these files from your main project:
   cp netlify/functions/revenuecat-webhook.js ./
   cp netlify/functions/health-check.js ./
   cp package.json ./
   cp netlify.toml ./
   ```

3. **Initialize git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial webhook setup"
   ```

4. **Push to GitHub**:
   ```bash
   # Create a new repository on GitHub, then:
   git remote add origin https://github.com/yourusername/cigar-webhook.git
   git push -u origin main
   ```

### Step 2: Deploy to Netlify

1. **Go to [Netlify](https://netlify.com)** and sign in

2. **Click "New site from Git"**

3. **Connect your GitHub account** (if not already connected)

4. **Select your webhook repository**: `cigar-webhook`

5. **Configure build settings**:
   - **Build command**: Leave empty (no build needed)
   - **Publish directory**: Leave empty
   - **Functions directory**: `netlify/functions`

6. **Click "Deploy site"**

### Step 3: Set Environment Variables

1. **Go to Site Settings** → **Environment Variables**

2. **Add these variables**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Click "Save"**

4. **Redeploy** (go to Deploys → Trigger deploy → Deploy site)

### Step 4: Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://your-site-name.netlify.app/.netlify/functions/revenuecat-webhook
```

**Example**: If your site is called `cigar-webhook-123`, your URL would be:
```
https://cigar-webhook-123.netlify.app/.netlify/functions/revenuecat-webhook
```

### Step 5: Test Your Webhook

1. **Test health check**:
   ```bash
   curl https://your-site-name.netlify.app/.netlify/functions/health-check
   ```

2. **Test webhook endpoint**:
   ```bash
   curl -X POST https://your-site-name.netlify.app/.netlify/functions/revenuecat-webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### Step 6: Configure RevenueCat

1. **Go to RevenueCat Dashboard** → **Project Settings** → **Webhooks**

2. **Add Webhook URL**:
   ```
   https://your-site-name.netlify.app/.netlify/functions/revenuecat-webhook
   ```

3. **Enable Events**:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE
   - ✅ TRANSFER

4. **Save Configuration**

5. **Test Webhook** (click "Test Webhook" button in RevenueCat)

## 🔧 Troubleshooting

### Webhook Not Working
1. **Check Netlify logs**: Site → Functions → revenuecat-webhook → View logs
2. **Verify environment variables** are set correctly
3. **Test with curl** to see error messages

### Database Not Updating
1. **Check Supabase logs** in your dashboard
2. **Verify webhook function** is deployed in Supabase
3. **Check user ID format** matches your auth system

### Environment Variables Missing
1. **Go to Site Settings** → **Environment Variables**
2. **Add missing variables**
3. **Redeploy** the site

## 📊 Monitoring

### Netlify Dashboard
- **Functions tab** shows webhook execution logs
- **Analytics** shows webhook call frequency
- **Deploys** shows deployment history

### RevenueCat Dashboard
- **Webhooks tab** shows delivery status
- **Events tab** shows subscription events
- **Test button** for manual testing

## 🎉 Success!

Once deployed and configured, your webhook will:

✅ **Automatically receive** RevenueCat events  
✅ **Update your database** in real-time  
✅ **Sync subscription status** across devices  
✅ **Handle all subscription lifecycle** events  

## 📞 Support

If you run into issues:
1. **Check Netlify function logs** for errors
2. **Verify Supabase webhook functions** are deployed
3. **Test with curl** to isolate issues
4. **Check RevenueCat webhook delivery** status

Your webhook URL will be:
**`https://your-site-name.netlify.app/.netlify/functions/revenuecat-webhook`**
