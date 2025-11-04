# Subscription Testing Guide

## Problem Identified ❌

**Issue:** You're seeing "already upgraded" message for new users, but they should be on a free trial.

**Root Cause:** None of your users have subscription records in the database, which causes the app to fall back to some default behavior that shows "already upgraded".

## Why This Happens 🔍

1. **No Subscription Records** - Users don't have entries in the `user_subscriptions` table
2. **RLS Policy Issues** - Row Level Security policies prevent creating subscription records
3. **App Fallback Behavior** - When no subscription data exists, the app might default to "premium" status

## Solution Steps ✅

### **Step 1: Fix Database RLS Policies**

**Go to your Supabase dashboard:**

1. Open **SQL Editor**
2. Run the contents of `fix_subscription_rls.sql`
3. This will:
   - Fix RLS policies for `user_subscriptions` table
   - Create trial subscriptions for all existing users
   - Ensure proper permissions

### **Step 2: Verify the Fix**

**Run this command to check the results:**

```bash
node check_subscription_status.js
```

**You should see:**

- ✅ All users now have subscription records
- ✅ Status shows "trial"
- ✅ `is_premium` shows `false`
- ✅ Trial end date is 3 days from now

### **Step 3: Test the App**

**After applying the database fix:**

1. **Open your app** - You should now see the trial banner
2. **Check profile screen** - Should show "Free trial" status
3. **Look for upgrade button** - Should show "Upgrade to Premium"
4. **Test upgrade flow** - Should work properly now

## Expected Results After Fix 🎯

### **Before Fix (Current State):**

- ❌ App shows "already upgraded"
- ❌ No trial banner
- ❌ No upgrade button
- ❌ Profile shows premium status

### **After Fix (Correct State):**

- ✅ App shows trial banner: "X days left in your free trial"
- ✅ Profile shows "Free trial" status
- ✅ Upgrade button shows "Upgrade to Premium"
- ✅ Can test the upgrade flow

## Manual Database Fix (Alternative) 🔧

**If the SQL script doesn't work, manually create trial subscriptions:**

1. **Go to Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Select `user_subscriptions` table**
4. **For each user in `profiles` table:**
   - Get their `id` from the `profiles` table
   - Get the trial plan `id` from `subscription_plans` table
   - Insert a new row in `user_subscriptions`:
     ```json
     {
       "user_id": "USER_ID_FROM_PROFILES",
       "plan_id": "TRIAL_PLAN_ID",
       "status": "trial",
       "is_premium": false,
       "trial_start_date": "2024-01-01T00:00:00Z",
       "trial_end_date": "2024-01-04T00:00:00Z",
       "auto_renew": true
     }
     ```

## Debug Commands 🛠️

### **Check Current Status:**

```bash
node check_subscription_status.js
```

### **Check Database Schema:**

```bash
node check_database_schema.js
```

### **Clear User for Testing:**

```bash
node clear_user_for_testing.js --reset USER_ID_HERE
```

## Files Created 📁

- ✅ `fix_subscription_rls.sql` - Database fix script
- ✅ `check_subscription_status.js` - Check user subscription status
- ✅ `clear_user_for_testing.js` - Clear user for testing
- ✅ `fix_user_subscription.js` - Fix user subscription records
- ✅ `check_database_schema.js` - Check database schema

## Summary

**The issue:** No subscription records exist for your users, causing the app to show "already upgraded".

**The fix:** Create proper trial subscription records for all existing users.

**The result:** Users will see the correct trial status and can test the upgrade flow.

Once you apply the database fix, your users should see the trial banner and upgrade button, allowing you to properly test the subscription upgrade flow! 🎉
