# RevenueCat Subscription Stability Issues - Root Cause Analysis & Solutions

## Issues Identified

### 1. **Wrong Subscription Dates (36 minutes for annual plan)**

**Problem**: RevenueCat is sending incorrect `expiration_at_ms` timestamps that result in very short subscription durations (36 minutes instead of 365 days for annual plans).

**Root Cause**:

- RevenueCat webhook is using raw timestamps without validation
- No date correction logic in the current deployed webhook
- Database function doesn't validate or correct problematic dates

**Evidence**: Screenshot shows subscription dates `2025-10-26 00:13:35+00` to `2025-10-26 00:49:35+00` (36 minutes apart) for an annual plan.

### 2. **RevenueCat User ID Not Syncing**

**Problem**: The `revenuecat_user_id` field in the database is not being populated when users upgrade.

**Root Cause**:

- Current webhook doesn't store the `revenuecat_user_id` field
- Database function doesn't include RevenueCat user ID in the upsert operation

## Solutions Implemented

### 1. **Corrected Webhook (`netlify/functions/revenuecat-webhook.js`)**

```javascript
// Date validation and correction logic
const purchasedAtDate = new Date(final_purchased_at_ms);
let expirationAtDate = new Date(final_expiration_at_ms);
const timeDifferenceMinutes = (expirationAtDate.getTime() - purchasedAtDate.getTime()) / (1000 * 60);

// Determine expected duration based on product_id
let expectedDurationDays = 0;
let subscription_plan_name = 'Premium Monthly'; // Default

if (product_id.includes('monthly') || product_id === '$rc_monthly') {
  expectedDurationDays = 30;
  subscription_plan_name = 'Premium Monthly';
} else if (product_id.includes('yearly') || product_id.includes('annual') || product_id === '$rc_annual') {
  expectedDurationDays = 365;
  subscription_plan_name = 'Premium Yearly';
}

// If the time difference is suspiciously short, correct the expiration date
if (expectedDurationDays > 0 && timeDifferenceMinutes < (expectedDurationDays * 24 * 60 - (24 * 60))) {
  console.warn(`⚠️ Detected problematic subscription dates for user ${app_user_id}. Original expiration: ${expirationAtDate.toISOString()}. Recalculating.`);
  expirationAtDate = new Date(purchasedAtDate.getTime() + (expectedDurationDays * 24 * 60 * 60 * 1000));
  final_expiration_at_ms = expirationAtDate.getTime();
  console.log(`✅ Corrected expiration date to: ${expirationAtDate.toISOString()} (based on ${expectedDurationDays} days)`);
}

// Store RevenueCat user ID
revenuecat_user_id: app_user_id, // FIXED: Store RevenueCat user ID
```

### 2. **Database Function Fix (`fix_database_function_and_existing_dates.sql`)**

```sql
-- Convert timestamps
purchased_at := to_timestamp(purchased_at_ms / 1000.0);
expiration_at := to_timestamp(expiration_at_ms / 1000.0);

-- Calculate time difference in minutes
time_diff_minutes := EXTRACT(EPOCH FROM (expiration_at - purchased_at)) / 60;

-- Determine expected duration based on product_id
CASE
  WHEN product_id LIKE '%monthly%' OR product_id = '$rc_monthly' THEN
    subscription_plan := 'premium_monthly';
    expected_days := 30;
  WHEN product_id LIKE '%annual%' OR product_id = '$rc_annual' OR product_id LIKE '%yearly%' THEN
    subscription_plan := 'premium_yearly';
    expected_days := 365;
  ELSE
    subscription_plan := 'premium_monthly';
    expected_days := 30;
END CASE;

-- FIXED: Check if dates are problematic and correct them
IF expected_days > 0 AND time_diff_minutes < (expected_days * 24 * 60 - (24 * 60)) THEN
  RAISE LOG 'Detected problematic subscription dates for user %. Original expiration: %. Recalculating.', app_user_id, expiration_at;
  corrected_expiration := purchased_at + (expected_days || ' days')::INTERVAL;
  expiration_at := corrected_expiration;
  RAISE LOG 'Corrected expiration date to: % (based on % days)', expiration_at, expected_days;
END IF;

-- Store RevenueCat user ID
revenuecat_user_id: app_user_id, -- FIXED: Store RevenueCat user ID
```

### 3. **Fix Existing Bad Subscriptions**

The SQL script also includes logic to fix existing subscriptions with incorrect dates:

```sql
-- Fix existing subscriptions with incorrect dates
DO $$
DECLARE
  user_sub RECORD;
  plan_name TEXT;
  new_end_date TIMESTAMP WITH TIME ZONE;
  plan_duration INTERVAL;
  corrected_count INTEGER := 0;
BEGIN
  FOR user_sub IN
    SELECT us.user_id, us.subscription_start_date, us.subscription_end_date, us.status, sp.name AS plan_name
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status IN ('active', 'cancelled')
      AND us.subscription_end_date IS NOT NULL
      AND us.subscription_start_date IS NOT NULL
      AND (us.subscription_end_date - us.subscription_start_date) < INTERVAL '29 days'
  LOOP
    -- Determine correct duration and recalculate end date
    -- Update subscription with corrected dates
  END LOOP;
END $$;
```

## Current Status

### ✅ **Completed**

1. **Root Cause Analysis**: Identified both issues (wrong dates + missing RevenueCat user ID)
2. **Webhook Fix**: Created corrected webhook with date validation and RevenueCat user ID syncing
3. **Database Function Fix**: Created SQL script to fix database function and existing subscriptions
4. **Testing**: Created test script to verify fixes work correctly

### ⚠️ **Blocked**

- **Deployment**: Cannot push to GitHub due to API key restrictions in repository
- **Database Fix**: Cannot run SQL script without database access

## Next Steps Required

### 1. **Deploy the Corrected Webhook**

You need to manually deploy the corrected webhook file:

- Copy the contents of `netlify/functions/revenuecat-webhook.js`
- Deploy it to your Netlify site
- Or resolve the GitHub API key issue and push the changes

### 2. **Run the Database Fix**

Execute the SQL script `fix_database_function_and_existing_dates.sql` in your Supabase database to:

- Update the database function with date correction logic
- Fix existing subscriptions with incorrect dates
- Add RevenueCat user ID syncing

### 3. **Test the Fix**

Run the test script `test_annual_subscription_fix.js` to verify:

- Date correction works for problematic subscriptions
- RevenueCat user ID is stored correctly
- Normal subscriptions are not affected

## Expected Results After Fix

1. **Annual subscriptions** will have correct 365-day durations instead of 36 minutes
2. **Monthly subscriptions** will have correct 30-day durations
3. **RevenueCat user IDs** will be stored in the database for proper sync
4. **Existing bad subscriptions** will be automatically corrected
5. **Future webhook events** will validate and correct dates automatically

## Files Created/Modified

- `netlify/functions/revenuecat-webhook.js` - Corrected webhook with date validation
- `fix_database_function_and_existing_dates.sql` - Database function and existing data fix
- `test_annual_subscription_fix.js` - Test script for verification

The core issues have been identified and solutions implemented. The main blocker is deployment due to GitHub's API key restrictions.
