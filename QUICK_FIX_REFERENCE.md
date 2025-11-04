# Quick Fix Reference - Trial Countdown Issues

## What Was Fixed

### 1. 🔢 Days Calculation (Database)

- **Problem:** Days calculated inconsistently, sometimes showing wrong values
- **Solution:** Improved SQL function to calculate days from hours for precision
- **Files:** `fix_trial_countdown.sql`, `update_subscription_schema.sql`

### 2. 🎯 Banner Dismissal (SubscriptionBanner.tsx)

- **Problem:** Banner reappeared too often after dismissing
- **Solution:** Only show again when days actually decrease (3→2→1→0)
- **File:** `src/components/SubscriptionBanner.tsx`

### 3. ⬆️ Upgrade Button (ProfileScreen.tsx)

- **Problem:** Button showed at wrong times, logic was confusing
- **Solution:** Always show for non-premium users, never for premium
- **File:** `src/screens/ProfileScreen.tsx`

### 4. 🔒 Paywall Logic (SubscriptionContext.tsx)

- **Problem:** Forced paywall on last day of trial
- **Solution:** Only block access after trial actually expires
- **File:** `src/contexts/SubscriptionContext.tsx`

---

## Apply Fixes Now

### Step 1: Database (Do this first!)

```sql
-- Copy and paste the entire content of fix_trial_countdown.sql
-- into your Supabase SQL Editor and run it
```

### Step 2: App Code (Already updated!)

The TypeScript/React files are already updated. Just rebuild:

```bash
# For iOS
eas build --platform ios --profile production

# For Android
eas build --platform android --profile production
```

### Step 3: Test

- Create a new test user
- Verify countdown shows correctly
- Dismiss banner, wait 10 seconds, check it stays dismissed
- Check profile shows correct status

---

## Display Rules (Quick Reference)

| User Status    | Banner                         | Upgrade Button (Profile)  | Manage Subscription | Paywall Blocks Access |
| -------------- | ------------------------------ | ------------------------- | ------------------- | --------------------- |
| Trial (3 days) | ✅ Shows "3 days left"         | ✅ "Upgrade to Premium"   | ❌ Hidden           | ❌ No                 |
| Trial (2 days) | ✅ Shows "2 days left"         | ✅ "Upgrade to Premium"   | ❌ Hidden           | ❌ No                 |
| Trial (1 day)  | ✅ Shows "1 day left" (urgent) | ✅ "Upgrade to Premium"   | ❌ Hidden           | ❌ No                 |
| Trial (0 days) | ✅ Shows "Expires today!"      | ✅ "Upgrade to Premium"   | ❌ Hidden           | ❌ No                 |
| Expired        | ✅ Shows "Expired - Upgrade"   | ✅ "Subscribe to Premium" | ❌ Hidden           | ✅ YES                |
| Premium        | ❌ Hidden                      | ❌ Hidden                 | ✅ Shows            | ❌ No                 |

---

## Countdown Logic Explained

The database now calculates days like this:

```
Time Remaining → Hours → Days (rounded up)

Example 1: 73 hours left = 73/24 = 3.04 days → Shows "3 days"
Example 2: 25 hours left = 25/24 = 1.04 days → Shows "1 day"
Example 3: 1 hour left = 1/24 = 0.04 days → Shows "1 day"
Example 4: 0 hours left = 0/24 = 0 days → Shows "0 days" (Expires today!)
```

This ensures users always see the most accurate count.

---

## Banner Dismissal Logic

When user dismisses banner:

- Stores: `{dismissed: true, daysRemaining: 3, dismissedAt: "2025-10-15T10:30:00Z"}`
- Banner reappears when: Days decrease to 2 (then 1, then 0)
- Day 0 cannot be permanently dismissed (too important!)
- Expired banner cannot be dismissed

---

## Common Issues & Solutions

### Issue: "Days still jumping around"

**Check:** Did you deploy the database function?

```sql
-- Run this to verify:
SELECT get_user_subscription_status('your-test-user-id');
-- Should return JSON with daysRemaining
```

### Issue: "Banner appears every time I open the app"

**Fix:** Clear dismissal state and test again:

```typescript
await AsyncStorage.removeItem('subscription_banner_dismissed');
```

### Issue: "Upgrade button not showing"

**Check:**

- Is user premium? (should NOT show)
- Is subscriptionStatus loaded? (console.log it)
- Is ProfileScreen using updated code?

### Issue: "Days showing negative number"

**This shouldn't happen anymore!** The new calculation prevents negatives.
If you see this, the database function isn't deployed.

---

## Files Changed

### SQL Files (Database)

- ✅ `fix_trial_countdown.sql` - Updated
- ✅ `update_subscription_schema.sql` - Updated

### TypeScript Files (App)

- ✅ `src/components/SubscriptionBanner.tsx` - Updated
- ✅ `src/screens/ProfileScreen.tsx` - Updated
- ✅ `src/contexts/SubscriptionContext.tsx` - Updated

### Documentation

- ✅ `TRIAL_COUNTDOWN_FIX.md` - Complete guide
- ✅ `QUICK_FIX_REFERENCE.md` - This file

---

## Need More Details?

See `TRIAL_COUNTDOWN_FIX.md` for:

- Complete testing checklist
- Detailed code explanations
- Troubleshooting guide
- Step-by-step deployment instructions
