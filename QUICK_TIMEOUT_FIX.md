# Quick Fix: Expo Go Timeout Issues

## What Was Fixed

### 🔍 **Problems Identified:**
1. **Session timeout (5 seconds)** - Too aggressive for Expo Go
2. **Profile load timeout (15 seconds)** - Still too short for slow connections  
3. **Incorrect onboarding flow** - Timeout errors treated as "new user"
4. **No retry logic** - Single attempt then fail
5. **Poor error handling** - All timeouts assumed new users

### ✅ **Solutions Applied:**

#### 1. **Dynamic Timeout Configuration**
- **Expo Go:** 10s session, 20s profile, 15s permissions
- **Production:** 5s session, 10s profile, 8s permissions
- **Auto-detection** of Expo Go environment

#### 2. **Better Retry Logic**
- **3 retries** in Expo Go (was 2)
- **Exponential backoff:** 1s, 2s, 4s delays
- **Smart error detection** (network vs database errors)

#### 3. **Smart Error Handling**
- **Check if user exists** before assuming new user
- **Preserve existing data** when possible
- **Graceful degradation** in Expo Go mode

#### 4. **Expo Go Specific Features**
- **Longer timeouts** for slower network
- **More retries** for network issues
- **Continue with degraded state** instead of failing

## Files Changed

### New File
- ✅ `src/config/development.ts` - Environment-aware configuration

### Modified File
- ✅ `src/contexts/AuthContext.tsx` - Improved timeout handling

## Test the Fix

### 1. **Clear App Data**
```bash
# In Expo Go: Shake device → "Reload"
# Or restart Expo Go completely
```

### 2. **Expected Behavior**
- ✅ **Existing users:** No onboarding (even with timeouts)
- ✅ **New users:** Proper onboarding flow
- ✅ **Network issues:** Retry and succeed
- ✅ **Slow connections:** Longer timeouts work

### 3. **Console Logs to Watch**
```
✅ Good: "Profile loaded successfully"
🔄 Retry: "Retrying profile load in 1000ms..."
⚠️ Warning: "Profile load timeout/network error - checking if user exists"
```

## Configuration

### Expo Go Settings (Automatic)
```typescript
TIMEOUTS: {
  SESSION_LOAD: 10000,        // 10 seconds
  PROFILE_LOAD: 20000,        // 20 seconds  
  PERMISSIONS_LOAD: 15000,    // 15 seconds
}
RETRIES: {
  MAX_ATTEMPTS: 3,            // 3 retries
  BACKOFF_MULTIPLIER: 2,      // 1s, 2s, 4s
}
```

### Production Settings (Automatic)
```typescript
TIMEOUTS: {
  SESSION_LOAD: 5000,         // 5 seconds
  PROFILE_LOAD: 10000,        // 10 seconds
  PERMISSIONS_LOAD: 8000,     // 8 seconds
}
RETRIES: {
  MAX_ATTEMPTS: 2,            // 2 retries
  BACKOFF_MULTIPLIER: 2,      // 1s, 2s
}
```

## Troubleshooting

### Still Getting Timeouts?
1. Check console: `console.log('Expo Go:', isExpoGo())`
2. Verify network connection
3. Try increasing timeouts in `development.ts`

### Onboarding Still Shows?
1. Check database: User exists in `profiles` table?
2. Check `onboarding_completed` field value
3. Clear app data and retry

### App Hangs?
1. Check if timeout is too long
2. Verify retry logic isn't infinite
3. Look for JavaScript errors

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| **Normal Login** | ✅ Works | ✅ Works (faster) |
| **Slow Network** | ❌ Timeout → Onboarding | ✅ Retry → Success |
| **Network Issues** | ❌ Timeout → Onboarding | ✅ Retry → Success |
| **New User** | ✅ Onboarding | ✅ Onboarding |
| **Existing User** | ❌ Wrong Onboarding | ✅ No Onboarding |

## Quick Test Checklist

- [ ] Open app in Expo Go
- [ ] Login with existing user
- [ ] Should NOT show onboarding
- [ ] Should load profile successfully
- [ ] Console shows success logs
- [ ] No timeout errors

The timeout issues should now be resolved! The app will handle Expo Go's slower network performance gracefully while maintaining proper onboarding flow logic.




