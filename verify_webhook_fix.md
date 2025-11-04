# 🔍 Webhook Deployment Verification Guide

## 🚀 Quick Test Steps

### Step 1: Find Your Netlify Site URL

1. **Go to your Netlify dashboard**
2. **Find your site** (should be something like `cigar-catalog-app` or similar)
3. **Copy the site URL** (e.g., `https://cigar-catalog-app.netlify.app`)

### Step 2: Test Your Webhook

Replace `YOUR_SITE_URL` with your actual Netlify site URL and run these commands:

```bash
# Test 1: Health Check
curl -X GET "https://YOUR_SITE_URL/.netlify/functions/revenuecat-webhook/health"

# Test 2: Connection Test
curl -X GET "https://YOUR_SITE_URL/.netlify/functions/revenuecat-webhook/test"

# Test 3: Mock Webhook (Normal Dates)
curl -X POST "https://YOUR_SITE_URL/.netlify/functions/revenuecat-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user-123",
      "product_id": "premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": "1698123456789",
      "expiration_at_ms": "1700715456789",
      "store": "APP_STORE",
      "is_trial_period": false,
      "auto_renew_status": true,
      "original_transaction_id": "1000000123456789",
      "transaction_id": "1000000123456789",
      "environment": "SANDBOX"
    }
  }'

# Test 4: Problematic Dates (3 minutes apart)
curl -X POST "https://YOUR_SITE_URL/.netlify/functions/revenuecat-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user-456",
      "product_id": "premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": "1698123456789",
      "expiration_at_ms": "1698123636789",
      "store": "APP_STORE",
      "is_trial_period": false,
      "auto_renew_status": true,
      "original_transaction_id": "1000000123456790",
      "transaction_id": "1000000123456790",
      "environment": "SANDBOX"
    }
  }'
```

## ✅ Expected Results

### Health Check Should Return:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-XX..."
}
```

### Connection Test Should Return:

```json
{
  "success": true,
  "message": "Supabase connection working"
}
```

### Mock Webhook Should Return:

```json
{
  "success": true,
  "data": { ... }
}
```

### Problematic Dates Test Should Return:

```json
{
  "success": true,
  "data": { ... },
  "corrected_dates": true
}
```

## 🚨 What to Look For

### ✅ Success Indicators:

- **Status 200** responses
- **"corrected_dates": true** for problematic dates test
- **No error messages** in responses
- **Database connection** working

### ❌ Failure Indicators:

- **Status 500** responses
- **"Invalid user ID format"** errors
- **"Plan not found"** errors
- **Database connection** failures

## 🔧 Troubleshooting

### If Health Check Fails:

1. **Check environment variables** in Netlify dashboard
2. **Verify Supabase service role key** is correct
3. **Check function logs** in Netlify dashboard

### If Connection Test Fails:

1. **Verify Supabase URL** is correct
2. **Check service role key** permissions
3. **Test Supabase connection** directly

### If Webhook Tests Fail:

1. **Check database functions** exist (run `revenuecat_webhook_setup.sql`)
2. **Verify user exists** in database
3. **Check function logs** for specific errors

## 📊 Advanced Testing

### Using the Test Script:

```bash
# Update the URL in test_webhook_deployment.js
node test_webhook_deployment.js
```

This will run all tests automatically and show detailed results.

## 🎯 Key Fix Verification

The most important test is **Test 4 (Problematic Dates)**. This should:

1. **Detect** that dates are only 3 minutes apart
2. **Log** the issue in the console
3. **Correct** the dates to 30 days (monthly) or 365 days (yearly)
4. **Return** `"corrected_dates": true` in the response

If this test passes, your webhook fix is working correctly! 🚀
