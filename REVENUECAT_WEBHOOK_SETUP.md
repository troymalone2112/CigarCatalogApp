# RevenueCat Webhook Setup Guide

This guide shows you how to set up automatic subscription synchronization between RevenueCat and your Supabase database using webhooks.

## 🎯 What This Accomplishes

- ✅ **Real-time sync** - Subscription changes update your database instantly
- ✅ **Automatic status updates** - Renewals, cancellations, expirations handled automatically
- ✅ **Trial management** - 3-day trials tracked and expired automatically
- ✅ **Premium status** - User premium status updated in real-time
- ✅ **Cross-device sync** - Subscription status synced across all user devices

## 📋 Prerequisites

1. ✅ RevenueCat dashboard configured with your products
2. ✅ Supabase database with subscription tables
3. ✅ Node.js hosting service (Vercel, Netlify, Railway, etc.)

## 🚀 Setup Steps

### Step 1: Run Database Migration

Execute the webhook setup SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of revenuecat_webhook_setup.sql
```

This creates:
- `handle_revenuecat_webhook()` function
- `revenuecat_webhook_handler()` function  
- Database indexes for performance

### Step 2: Deploy Webhook Endpoint

#### Option A: Deploy to Vercel (Recommended)

1. **Create new Vercel project:**
   ```bash
   mkdir revenuecat-webhook
   cd revenuecat-webhook
   ```

2. **Copy files:**
   ```bash
   cp revenuecat_webhook_endpoint.js index.js
   cp webhook_package.json package.json
   ```

3. **Set environment variables in Vercel:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Get your webhook URL:**
   ```
   https://your-project.vercel.app/webhook/revenuecat
   ```

#### Option B: Deploy to Netlify Functions

1. **Create netlify/functions directory:**
   ```bash
   mkdir -p netlify/functions
   ```

2. **Create netlify/functions/revenuecat-webhook.js:**
   ```javascript
   // Copy contents of revenuecat_webhook_endpoint.js
   // Export as Netlify function
   exports.handler = async (event, context) => {
     // Handle the webhook logic
   };
   ```

3. **Deploy to Netlify**

#### Option C: Deploy to Railway

1. **Create new Railway project**
2. **Upload the webhook files**
3. **Set environment variables**
4. **Deploy**

### Step 3: Configure RevenueCat Webhook

1. **Go to RevenueCat Dashboard**
2. **Navigate to:** Project Settings → Webhooks
3. **Add Webhook URL:**
   ```
   https://your-deployed-url.com/webhook/revenuecat
   ```
4. **Enable Events:**
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL  
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE
   - ✅ TRANSFER

5. **Save Configuration**

### Step 4: Test the Webhook

1. **Test webhook endpoint:**
   ```bash
   curl -X POST https://your-webhook-url.com/webhook/revenuecat \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Test in RevenueCat dashboard:**
   - Go to Project Settings → Webhooks
   - Click "Test Webhook" button

3. **Test with real purchase:**
   - Make a test purchase in your app
   - Check your database for updated subscription status

## 🔄 How It Works

### 1. User Makes Purchase
```
User → App → RevenueCat → Apple → Purchase Complete
```

### 2. RevenueCat Sends Webhook
```
RevenueCat → Your Webhook URL → Supabase Database
```

### 3. Database Updates
```sql
-- Updates user_subscriptions table
-- Updates profiles.is_premium field
-- Logs all subscription events
```

### 4. App Syncs Status
```
App → Supabase → Updated Premium Status
```

## 📊 Webhook Events Handled

| Event | Description | Database Action |
|-------|-------------|-----------------|
| `INITIAL_PURCHASE` | First subscription | Set status to `active`, enable premium |
| `RENEWAL` | Subscription renewed | Extend current_period_end, keep active |
| `CANCELLATION` | User cancelled | Set status to `cancelled`, keep premium until expiration |
| `EXPIRATION` | Subscription expired | Set status to `expired`, disable premium |
| `BILLING_ISSUE` | Payment failed | Set status to `past_due`, may disable premium |
| `TRANSFER` | Subscription transferred | Update user_id, maintain subscription |

## 🛠️ Troubleshooting

### Webhook Not Receiving Events
1. **Check webhook URL** - Ensure it's publicly accessible
2. **Check logs** - Look for webhook delivery failures in RevenueCat
3. **Test endpoint** - Verify your webhook responds to POST requests

### Database Not Updating
1. **Check Supabase logs** - Look for function execution errors
2. **Verify user IDs** - Ensure app_user_id matches your user.id format
3. **Check permissions** - Verify service role key has proper access

### Premium Status Not Updating
1. **Check profiles table** - Verify is_premium field updates
2. **Check subscription status** - Ensure status is 'active' or 'cancelled'
3. **Check expiration dates** - Verify current_period_end is in future

## 🔐 Security Considerations

1. **Validate webhook signatures** (optional but recommended)
2. **Use HTTPS** for webhook URLs
3. **Protect service role key** - Don't expose in client code
4. **Rate limiting** - Consider implementing rate limiting for webhook endpoint

## 📈 Monitoring

### Key Metrics to Track
- ✅ Webhook delivery success rate
- ✅ Database update success rate  
- ✅ Subscription status accuracy
- ✅ Premium feature access

### Logging
- All webhook events are logged with timestamps
- Database updates are logged with user and subscription details
- Errors are logged with full context for debugging

## 🎉 Benefits

Once set up, this webhook system provides:

- **🔄 Automatic sync** - No manual intervention needed
- **⚡ Real-time updates** - Instant status changes
- **🎯 Accurate billing** - Precise subscription tracking
- **📱 Cross-device** - Works across all user devices
- **🛡️ Reliable** - Handles all subscription lifecycle events
- **📊 Auditable** - Full event logging and history

Your subscription system will now be fully automated and reliable! 🚀
