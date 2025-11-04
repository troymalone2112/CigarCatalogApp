# Subscription Upgrade Debug Guide

## Problem Identified ❌

**Issue:** After successfully upgrading to premium on TestFlight, users still see:

1. **Upgrade banner** on the main screen (should disappear)
2. **"Free trial" status** on profile screen (should show "Premium")
3. **"Upgrade to Premium" button** on profile screen (should show "Manage Subscription")

## Root Cause Analysis 🔍

### **1. Database Function Issue**

The `update_subscription_from_revenuecat` function is not properly updating the subscription status to 'active' when a user upgrades to premium.

**Current Function Problems:**

- ✅ Updates `is_premium = true`
- ❌ **Does NOT update `status = 'active'`**
- ❌ **Does NOT set proper subscription dates**
- ❌ **Does NOT update plan_id to premium plan**

### **2. Subscription Context Refresh Issue**

The `refreshSubscription` function was not forcing a sync with RevenueCat, so it was only getting local database status.

**Fixed:** Now calls `loadSubscriptionData(true)` to force RevenueCat sync.

### **3. UI Logic Dependencies**

Both the banner and profile screen depend on `subscriptionStatus.isPremium` being `true` to hide upgrade elements and show premium elements.

## Solution Implemented ✅

### **1. Fixed Database Function** (`fix_subscription_upgrade.sql`)

**Updated `update_subscription_from_revenuecat` function:**

```sql
-- When user upgrades to premium (is_premium = true):
UPDATE user_subscriptions
SET
  status = 'active',                    -- ✅ Set status to active
  plan_id = premium_plan_id,           -- ✅ Set to premium plan
  is_premium = true,                   -- ✅ Mark as premium
  subscription_start_date = NOW(),     -- ✅ Set start date
  subscription_end_date = NOW() + INTERVAL '1 month', -- ✅ Set end date
  revenuecat_user_id = COALESCE(revenuecat_user_id, user_subscriptions.revenuecat_user_id),
  last_sync_date = NOW(),
  updated_at = NOW()
WHERE user_id = user_uuid;
```

### **2. Fixed Subscription Context** (`src/contexts/SubscriptionContext.tsx`)

**Updated `refreshSubscription` function:**

```typescript
const refreshSubscription = async () => {
  await loadSubscriptionData(true); // ✅ Force refresh to sync with RevenueCat
};
```

### **3. UI Logic Verification**

**SubscriptionBanner Logic:**

```typescript
// Don't show banner if user has active premium subscription
if (subscriptionStatus.isPremium) return null;
```

**ProfileScreen Logic:**

```typescript
// Show upgrade button for all non-premium users
const shouldShowUpgrade = !subscriptionStatus?.isPremium;

// Only show Manage Subscription for premium users
{subscriptionStatus?.isPremium && (
  <TouchableOpacity onPress={handleManageSubscription}>
    <Text>Manage Subscription</Text>
  </TouchableOpacity>
)}
```

## Testing Steps 🧪

### **1. Run Database Fix**

```bash
# Apply the database function fix
psql -h your-supabase-host -U postgres -d postgres -f fix_subscription_upgrade.sql
```

### **2. Test Upgrade Flow**

1. **Start as trial user** - Should see banner and "Upgrade" button
2. **Upgrade to premium** - Should trigger RevenueCat purchase
3. **After successful purchase** - Should:
   - ✅ Banner disappears
   - ✅ Profile shows "Premium" status
   - ✅ Profile shows "Manage Subscription" button
   - ✅ No more "Upgrade" button

### **3. Debug Logging**

The code includes extensive logging to track the upgrade flow:

**RevenueCat Service:**

```typescript
console.log('🔄 Syncing subscription status for user:', userId);
console.log('🔍 RevenueCat premium access:', hasPremiumAccess);
console.log('✅ Subscription status synced:', statusData);
```

**Subscription Context:**

```typescript
console.log('🔍 SubscriptionContext - Subscription status:', status);
console.log('🔄 Force refresh - syncing with RevenueCat...');
```

**ProfileScreen:**

```typescript
console.log('🔍 ProfileScreen - subscriptionStatus:', subscriptionStatus);
console.log('🔍 ProfileScreen - isPremium:', subscriptionStatus?.isPremium);
console.log('🔍 ProfileScreen - Should show upgrade button:', !subscriptionStatus?.isPremium);
```

## Expected Results After Fix ✅

### **For Trial Users (Before Upgrade):**

- ✅ **Banner shows** - "X days left in your free trial"
- ✅ **Profile shows** - "Free trial" status
- ✅ **Upgrade button** - "Upgrade to Premium"

### **For Premium Users (After Upgrade):**

- ✅ **Banner hidden** - No subscription banner
- ✅ **Profile shows** - "Premium" status with star badge
- ✅ **Manage button** - "Manage Subscription" button
- ✅ **No upgrade button** - Upgrade button hidden

## Files Modified 📁

### **Database:**

- ✅ `fix_subscription_upgrade.sql` - Fixed database function

### **Code:**

- ✅ `src/contexts/SubscriptionContext.tsx` - Fixed refreshSubscription
- ✅ `src/services/revenueCatService.ts` - Already had proper sync logic
- ✅ `src/screens/PaywallScreen.tsx` - Already calls refreshSubscription after purchase

### **UI Components:**

- ✅ `src/components/SubscriptionBanner.tsx` - Already has proper logic
- ✅ `src/screens/ProfileScreen.tsx` - Already has proper logic

## Debug Commands 🔧

### **Check Current Subscription Status:**

```sql
SELECT
  us.user_id,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date,
  us.subscription_start_date,
  us.subscription_end_date,
  us.last_sync_date,
  p.full_name
FROM user_subscriptions us
LEFT JOIN profiles p ON us.user_id = p.id
ORDER BY us.updated_at DESC
LIMIT 10;
```

### **Test Database Function:**

```sql
-- Test with actual user ID
SELECT update_subscription_from_revenuecat('your-user-id-here', true, 'test-revenuecat-id');
```

## Summary

**Root Cause:** Database function wasn't properly updating subscription status to 'active' after premium upgrade.

**Fix:** Updated database function to properly set status, plan, and dates when user upgrades to premium.

**Result:** After upgrade, users will see proper premium status in UI, banner will disappear, and profile will show "Manage Subscription" instead of "Upgrade".
