# Expo Go Timeout Issues - Complete Fix Guide

## Problem Summary

You're experiencing timeout errors in Expo Go that cause:
1. **Session timeout** - "Error getting initial session: Error: Session timeout"
2. **Profile load timeout** - "Error loading profile: Error: Profile load timeout"
3. **Incorrect onboarding flow** - App assumes user is new when profile fails to load

## Root Causes

### 1. **Expo Go Network Performance**
- Expo Go has slower network connections than native builds
- Development server adds latency
- Hot reloading can interrupt network requests

### 2. **Aggressive Timeouts**
- Session timeout: 5 seconds (too short for Expo Go)
- Profile timeout: 15 seconds (still too short for slow connections)
- No retry logic for network issues

### 3. **Poor Error Handling**
- Timeout errors treated as "new user" scenarios
- No distinction between network issues and actual errors
- Onboarding flow incorrectly triggered

## Solutions Applied

### 1. **Dynamic Timeout Configuration** ✅

**File:** `src/config/development.ts`

Created environment-aware timeout settings:

```typescript
export const DEVELOPMENT_CONFIG = {
  TIMEOUTS: {
    SESSION_LOAD: 10000,        // 10 seconds (was 5)
    PROFILE_LOAD: 20000,        // 20 seconds (was 15)  
    PERMISSIONS_LOAD: 15000,    // 15 seconds (was 10)
    AUTH_LOADING: 15000,        // 15 seconds (was 10)
  },
  RETRIES: {
    MAX_ATTEMPTS: 3,            // 3 retries (was 2)
    BACKOFF_MULTIPLIER: 2,      // Exponential backoff
    INITIAL_DELAY: 1000,        // 1 second initial delay
  }
};
```

### 2. **Improved AuthContext** ✅

**File:** `src/contexts/AuthContext.tsx`

#### A. Dynamic Timeouts
```typescript
// Before: Fixed 5-second timeout
setTimeout(() => reject(new Error('Session timeout')), 5000)

// After: Environment-aware timeout
const sessionTimeout = getTimeoutValue(5000, 'session'); // 10s in Expo Go
setTimeout(() => reject(new Error('Session timeout')), sessionTimeout)
```

#### B. Better Retry Logic
```typescript
// Before: 2 retries with fixed delays
if (retryCount < 2) {
  const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
}

// After: 3 retries with dynamic delays
const maxRetries = getRetryCount(); // 3 in Expo Go
const delay = getRetryDelay(retryCount); // 1s, 2s, 4s
```

#### C. Smart Error Handling
```typescript
// Before: All timeouts treated as "new user"
if (errorMessage.includes('timeout')) {
  setProfile({ onboarding_completed: true }); // Wrong!
}

// After: Check if user actually exists
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id, onboarding_completed')
  .eq('id', userId)
  .single();

if (existingProfile) {
  // Use existing profile data
  setProfile({
    onboarding_completed: existingProfile.onboarding_completed
  });
}
```

#### D. Graceful Degradation
```typescript
// Before: Fail completely on timeout
.catch((error) => {
  console.error('Session timeout');
  setLoading(false);
});

// After: Continue with degraded state in Expo Go
.catch((error) => {
  if (shouldUseGracefulDegradation()) {
    console.log('Continuing with degraded auth state (Expo Go mode)');
    setLoading(false);
  } else {
    // Fail in production
    setLoading(false);
  }
});
```

### 3. **Expo Go Detection** ✅

**File:** `src/config/development.ts`

```typescript
export const isExpoGo = () => {
  return __DEV__ && 
         typeof navigator !== 'undefined' && 
         navigator.product === 'ReactNative' &&
         (global as any).expo?.modules?.ExpoGo;
};
```

This allows the app to:
- Use longer timeouts in Expo Go
- Preserve existing data when possible
- Continue with degraded state on errors

## Testing the Fix

### 1. **Clear App Data**
```bash
# In Expo Go, shake device and select "Reload"
# Or restart Expo Go completely
```

### 2. **Test Scenarios**

#### Scenario A: Normal Login (Should Work)
1. Open app in Expo Go
2. Login with existing user
3. Should load profile without timeout errors
4. Should NOT show onboarding

#### Scenario B: Network Issues (Should Handle Gracefully)
1. Turn off WiFi briefly during login
2. Turn WiFi back on
3. App should retry and eventually succeed
4. Should NOT show onboarding for existing users

#### Scenario C: New User (Should Show Onboarding)
1. Create new account
2. Should show onboarding flow
3. Should complete successfully

### 3. **Console Logs to Watch For**

**Good Logs (Success):**
```
🚀 AuthContext: Starting initialization...
🔍 Initial session check: user-123
👤 User found, loading profile and permissions...
✅ Profile loaded successfully: {onboarding_completed: true}
✅ Auth initialization complete
```

**Warning Logs (Retry):**
```
❌ Error loading profile: Profile load timeout
🔄 Retrying profile load in 1000ms... (attempt 1/3)
🔄 Retrying profile load in 2000ms... (attempt 2/3)
✅ Profile loaded successfully: {onboarding_completed: true}
```

**Error Logs (Degraded State):**
```
❌ Error loading profile: Profile load timeout
⚠️ Profile load timeout/network error - checking if user exists in database
✅ User exists in database, using existing profile data
```

## Configuration Options

### For Development (Expo Go)
```typescript
// Longer timeouts
SESSION_LOAD: 10000,        // 10 seconds
PROFILE_LOAD: 20000,        // 20 seconds
PERMISSIONS_LOAD: 15000,    // 15 seconds

// More retries
MAX_ATTEMPTS: 3,            // 3 retries
BACKOFF_MULTIPLIER: 2,      // 1s, 2s, 4s delays

// Graceful degradation
GRACEFUL_DEGRADATION: true,  // Continue on errors
PRESERVE_EXISTING_DATA: true // Keep existing data
```

### For Production (Native Builds)
```typescript
// Shorter timeouts (faster failure)
SESSION_LOAD: 5000,         // 5 seconds
PROFILE_LOAD: 10000,        // 10 seconds
PERMISSIONS_LOAD: 8000,     // 8 seconds

// Fewer retries
MAX_ATTEMPTS: 2,            // 2 retries
BACKOFF_MULTIPLIER: 2,      // 1s, 2s delays

// Fail fast
GRACEFUL_DEGRADATION: false, // Fail on errors
PRESERVE_EXISTING_DATA: false // Don't preserve on errors
```

## Troubleshooting

### Issue: "Still getting timeouts"
**Solution:**
1. Check if you're in Expo Go: `console.log('Expo Go:', isExpoGo())`
2. Verify config is loaded: `console.log('Config:', DEVELOPMENT_CONFIG)`
3. Check network connection
4. Try increasing timeouts further

### Issue: "Onboarding still shows for existing users"
**Solution:**
1. Check database query in console logs
2. Verify user exists in `profiles` table
3. Check `onboarding_completed` field value
4. Clear app data and try again

### Issue: "App hangs on loading screen"
**Solution:**
1. Check if timeout is too long
2. Verify retry logic isn't infinite
3. Check for network connectivity
4. Look for JavaScript errors in console

## Files Changed

### New Files
- ✅ `src/config/development.ts` - Development configuration

### Modified Files  
- ✅ `src/contexts/AuthContext.tsx` - Improved timeout handling

### Key Improvements
1. **Dynamic timeouts** based on environment
2. **Better retry logic** with exponential backoff
3. **Smart error handling** that distinguishes network vs database errors
4. **Graceful degradation** for Expo Go
5. **Preserve existing data** when possible

## Expected Results

### Before Fix ❌
```
Session timeout after 5 seconds
Profile load timeout after 15 seconds  
Onboarding shows for existing users
App hangs or crashes on network issues
```

### After Fix ✅
```
Session loads within 10 seconds (or retries)
Profile loads within 20 seconds (or retries)
Existing users don't see onboarding
App continues with degraded state on network issues
```

## Next Steps

1. **Test the fixes** in Expo Go
2. **Monitor console logs** for timeout patterns
3. **Adjust timeouts** if needed for your network
4. **Deploy to production** with production config
5. **Monitor production** for any timeout issues

The app should now handle Expo Go's slower network performance gracefully while maintaining proper onboarding flow logic!
