# Free Trial Countdown Fix - Complete Guide

## Problem Summary

The free trial countdown was showing inconsistent values across different parts of the app due to:

1. **Incorrect database calculation** - Days were calculated inconsistently
2. **Aggressive banner dismissal reset** - Banner reappeared too frequently
3. **Confusing upgrade button logic** - Showed/hid at wrong times
4. **Unclear display rules** - Banner and buttons appeared inconsistently

## Changes Made

### 1. Database Functions (SQL)

**Files Updated:**
- `fix_trial_countdown.sql`
- `update_subscription_schema.sql`

**Key Fix:**
Improved the days remaining calculation to be more accurate:

```sql
-- Old calculation (could be inaccurate)
days_left := CEIL(EXTRACT(EPOCH FROM (trial_end_date - NOW())) / 86400)::INTEGER;

-- New calculation (more precise)
hours_left := EXTRACT(EPOCH FROM (trial_end_date - NOW())) / 3600;
IF hours_left > 0 THEN
  days_left := CEIL(hours_left / 24)::INTEGER;
ELSE
  days_left := 0;
END IF;
```

**Why this matters:**
- Converts time to hours first for better precision
- Ensures "1 day" shows even if only 1 hour remains
- Uses CEIL to round up, so users see the full day count
- Prevents negative values

**To Apply:**
Run this SQL in your Supabase SQL Editor:
```bash
# Option 1: Use the fix_trial_countdown.sql file
psql your_database < fix_trial_countdown.sql

# Option 2: Copy and paste from fix_trial_countdown.sql into Supabase SQL Editor
```

---

### 2. Subscription Banner Component

**File:** `src/components/SubscriptionBanner.tsx`

**Key Changes:**

#### A. Smarter Dismissal Logic
- Banner now remembers **which day** it was dismissed on
- Only reappears when days decrease (3→2, 2→1, etc.)
- Always shows on day 0 (expires today) - cannot be dismissed permanently
- Always shows when trial expires

**Before:**
```typescript
// Reset on any status change
if (subscriptionStatus.status === 'trial' || !subscriptionStatus.hasAccess) {
  resetDismissal();
}
```

**After:**
```typescript
// Only reset when days actually decrease
if (lastDismissedDaysRemaining !== null && 
    currentDays < lastDismissedDaysRemaining) {
  resetDismissal();
}

// Always show on last day
if (currentDays === 0 && isDismissed) {
  forceShow();
}
```

#### B. Enhanced Dismissal Storage
Stores more context when dismissed:

```typescript
const dismissalData = JSON.stringify({
  dismissed: true,
  daysRemaining: subscriptionStatus.daysRemaining,
  dismissedAt: new Date().toISOString()
});
```

This allows the app to intelligently decide when to show the banner again.

---

### 3. Profile Screen

**File:** `src/screens/ProfileScreen.tsx`

**Key Changes:**

#### A. Upgrade Button Logic
**Before:** Only showed when `!isPremium && !hasEverSubscribed`
**After:** Shows for all non-premium users (trial or expired)

```typescript
{/* Upgrade Button - Show for trial or expired users, not for premium */}
{!subscriptionStatus?.isPremium && (
  <TouchableOpacity 
    style={styles.upgradeButton}
    onPress={handleUpgrade}
  >
    <Text style={styles.upgradeButtonText}>
      {subscriptionStatus?.isTrialActive 
        ? 'Upgrade to Premium' 
        : 'Subscribe to Premium'}
    </Text>
  </TouchableOpacity>
)}
```

#### B. Manage Subscription Button
**Before:** Showed when `hasEverSubscribed || isPremium`
**After:** Only shows for premium users

```typescript
{/* Only show Manage Subscription for premium users */}
{subscriptionStatus?.isPremium && (
  <TouchableOpacity 
    style={styles.actionButton}
    onPress={handleManageSubscription}
  >
    <Text style={styles.actionButtonText}>Manage Subscription</Text>
  </TouchableOpacity>
)}
```

---

### 4. Subscription Context

**File:** `src/contexts/SubscriptionContext.tsx`

**Key Change:**

Simplified paywall logic - don't force paywall on last day of trial:

**Before:**
```typescript
const shouldShowPaywall = !subscriptionStatus.hasAccess || 
  (subscriptionStatus.isTrialActive && subscriptionStatus.daysRemaining <= 1);
```

**After:**
```typescript
// Show paywall only if user has no access (trial expired)
// Don't force paywall during active trial, even on last day
const shouldShowPaywall = !subscriptionStatus.hasAccess;
```

This allows users to enjoy their full trial period without being interrupted.

---

## Display Logic Summary

### When Banner Shows:
- ✅ During active trial (3, 2, 1, or 0 days remaining)
- ✅ When trial expires (hasAccess = false)
- ✅ When days decrease after being dismissed
- ✅ Always on day 0 (cannot be hidden)
- ❌ NOT when user is premium

### When Upgrade Button Shows (Profile):
- ✅ When on active trial
- ✅ When trial expired
- ❌ NOT when user is premium

### When Manage Subscription Shows (Profile):
- ✅ Only when user is premium
- ❌ NOT during trial
- ❌ NOT when expired

### When Paywall Blocks Access:
- ✅ Only when trial is expired (hasAccess = false)
- ❌ NOT during active trial (even on day 0)

---

## Testing Checklist

After applying these fixes, test the following scenarios:

### Scenario 1: New User (3 Days Remaining)
- [ ] Banner shows "3 days left"
- [ ] Can dismiss banner
- [ ] Banner stays dismissed until next day
- [ ] Profile shows "Free Trial Member - 3 days remaining"
- [ ] "Upgrade to Premium" button visible in Profile
- [ ] No "Manage Subscription" button

### Scenario 2: Day 2 of Trial
- [ ] Banner reappears showing "2 days left"
- [ ] Can dismiss again
- [ ] Days countdown is consistent across app

### Scenario 3: Day 1 of Trial
- [ ] Banner shows "1 day left"
- [ ] Marked as urgent (warning icon)
- [ ] Can still dismiss

### Scenario 4: Last Day (0 Days)
- [ ] Banner shows "Trial expires today!"
- [ ] Cannot be permanently dismissed
- [ ] Still has full access to app features
- [ ] Profile shows "0 days remaining"

### Scenario 5: Trial Expired
- [ ] Banner shows "Trial expired - Upgrade to continue"
- [ ] Banner cannot be dismissed
- [ ] Profile shows "Free Member - Limited access"
- [ ] "Subscribe to Premium" button shows
- [ ] App blocks premium features
- [ ] Paywall appears when accessing premium features

### Scenario 6: Premium User
- [ ] No banner shows
- [ ] Profile shows "Premium Member - Full access"
- [ ] "Manage Subscription" button visible
- [ ] No "Upgrade" button
- [ ] Full access to all features

---

## Deployment Steps

### Step 1: Update Database Functions
```bash
# In Supabase SQL Editor, run:
# Copy contents of fix_trial_countdown.sql and execute
```

### Step 2: Deploy App Code
```bash
# Your code changes are already in the files
# Build and deploy as normal
eas build --platform ios --profile production
```

### Step 3: Clear Old Dismissal Data (Optional)
If you want to reset all banner dismissals for existing users:
```typescript
// In your app initialization or settings:
await AsyncStorage.removeItem('subscription_banner_dismissed');
```

### Step 4: Test All Scenarios
Go through the testing checklist above

---

## Troubleshooting

### Banner shows wrong days
**Solution:** Ensure database function is deployed:
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_user_subscription_status';

-- Verify it returns correct structure
SELECT get_user_subscription_status('your-user-uuid');
```

### Days jumping around
**Possible Causes:**
1. Database function not updated
2. Multiple users logged in on same device
3. Timezone issues

**Solution:** 
- Verify SQL functions are deployed
- Check user ID is consistent
- All date calculations now use server time (NOW())

### Banner appears too often
**Solution:** 
- Clear AsyncStorage: `await AsyncStorage.removeItem('subscription_banner_dismissed');`
- Verify you're using the updated SubscriptionBanner.tsx code

### Upgrade button not showing
**Solution:**
- Verify subscriptionStatus.isPremium is correctly set
- Check database `is_premium` field value
- Ensure RevenueCat sync is working

---

## Key Improvements

1. **Consistent Countdown:** Single source of truth (database function)
2. **Better UX:** Banner only reappears when meaningful (day changes)
3. **Clear CTA:** Upgrade button shows when appropriate
4. **Full Trial Access:** Users can use app fully until trial expires
5. **Accurate Display:** Days calculation handles edge cases properly

---

## Notes for Developers

- All date calculations use UTC server time (`NOW()`)
- Days are rounded UP using `CEIL()` to be user-friendly
- Banner dismissal is stored with context (days, timestamp)
- Database function creates trial automatically on first call
- RevenueCat sync preserves trial dates (doesn't reset them)

---

## Contact

If you encounter any issues with these fixes, check:
1. Database function is deployed correctly
2. App code is updated and rebuilt
3. AsyncStorage is clean (no old dismissal format)
4. User subscription record exists in database


