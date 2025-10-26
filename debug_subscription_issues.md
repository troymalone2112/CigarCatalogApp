# Debugging Subscription Issues

## Issues to Investigate

### 1. Auto-renewal showing as False
**Possible causes:**
- RevenueCat is sending `auto_renew_status: false` in the webhook payload
- The subscription was set up as non-renewing
- RevenueCat's default behavior for that product

**Debug steps:**
1. Check the webhook logs to see what `auto_renew_status` value is being sent
2. Verify the RevenueCat product configuration
3. Check if the subscription is set up correctly in RevenueCat dashboard

### 2. Banner still showing after upgrade
**Possible causes:**
- App not refreshing subscription status after purchase
- Database function not setting `is_premium` correctly
- Timing issue between webhook and app refresh
- App caching old subscription status

**Debug steps:**
1. Check if the database has the correct `is_premium` value
2. Verify the app is calling `refreshSubscription()` after purchase
3. Check if there's a timing delay between webhook and app refresh
4. Test manual refresh of subscription status

## Debugging Commands

### Check Latest Subscription Data
```bash
# Update the script with your Supabase credentials first
node check_latest_subscription.js
```

### Test Subscription Status Function
```bash
# Test the database function directly
node test_subscription_refresh.js
```

### Check Webhook Logs
1. Go to your Netlify dashboard
2. Check the function logs for the webhook
3. Look for the webhook payload and processing logs

## Quick Fixes to Try

### 1. Force Refresh Subscription Status
In your app, after a successful purchase, try:
```javascript
// Force refresh the subscription context
await refreshSubscription();

// Wait a moment for the webhook to process
setTimeout(async () => {
  await refreshSubscription();
}, 2000);
```

### 2. Check Database Function
Make sure the `handle_revenuecat_webhook` function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'handle_revenuecat_webhook';
```

### 3. Verify is_premium Field
Check if the `is_premium` field is being set correctly:
```sql
SELECT user_id, is_premium, status, subscription_end_date, updated_at 
FROM user_subscriptions 
ORDER BY updated_at DESC 
LIMIT 1;
```

## Expected Behavior

After a successful purchase:
1. Webhook should receive the RevenueCat event
2. Database should be updated with `is_premium = true`
3. App should refresh and hide the banner
4. `auto_renew` should be `true` for normal subscriptions

## Next Steps

1. Run the debug scripts to check current state
2. Check webhook logs for the actual payload
3. Verify the database function is working
4. Test manual refresh of subscription status

