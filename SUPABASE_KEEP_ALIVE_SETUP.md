# Supabase Keep-Alive Implementation Guide

## 🎯 Overview

This guide explains how to implement a keep-alive ping mechanism to prevent Supabase connections from going idle, complementing the existing client-side `ConnectionManager`.

## 📊 Current Architecture

### Client-Side (React Native App)
- **`ConnectionManager`** (`src/services/connectionManager.ts`)
  - Detects stale connections after 5 minutes of inactivity
  - Refreshes connections proactively when app is active
  - Works well for active users

### Limitations
- Doesn't work when app is closed/backgrounded
- Requires active user sessions
- May miss long idle periods

## ✅ Solution: Server-Side Keep-Alive

A server-side keep-alive ping ensures Supabase stays warm even when:
- App is closed
- No active users
- Long idle periods

## 🚀 Implementation Options

### Option 1: Netlify Scheduled Functions (Recommended if on Netlify Pro)

**Pros:**
- Native Netlify integration
- No external dependencies
- Automatic execution

**Cons:**
- Requires Netlify Pro plan ($19/month)
- Scheduled functions are a Pro feature

**Setup:**
1. Add to `netlify.toml`:
```toml
[[build.schedule]]
  cron = "*/5 * * * *"  # Every 5 minutes
  function = "keep-alive"
```

2. Deploy to Netlify

### Option 2: External Cron Service (Recommended for Free Tier)

**Pros:**
- Works with Netlify Free tier
- No additional cost
- More flexible scheduling

**Cons:**
- Requires external service setup
- Additional dependency

**Recommended Services:**
- **cron-job.org** (Free, reliable)
- **EasyCron** (Free tier available)
- **UptimeRobot** (Free monitoring + cron)

**Setup Steps:**

1. **Deploy the keep-alive function** (already created at `netlify/functions/keep-alive.js`)

2. **Get your Netlify function URL:**
   ```
   https://your-site.netlify.app/.netlify/functions/keep-alive
   ```
   Or use the redirect:
   ```
   https://your-site.netlify.app/keep-alive
   ```

3. **Set up cron job:**
   - **Service:** cron-job.org
   - **URL:** `https://your-site.netlify.app/keep-alive`
   - **Schedule:** Every 5 minutes: `*/5 * * * *`
   - **Method:** GET

4. **Configure environment variables in Netlify:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add:
     - `SUPABASE_URL` (or use `EXPO_PUBLIC_SUPABASE_URL` if already set)
     - `SUPABASE_ANON_KEY` (or use `EXPO_PUBLIC_SUPABASE_ANON_KEY` if already set)

### Option 3: App-Level Background Ping (Alternative)

You could also ping from the app itself using a background task, but this is less reliable than server-side.

## 📝 Implementation Details

### Keep-Alive Function (`netlify/functions/keep-alive.js`)

The function:
- Performs a lightweight query to Supabase (`profiles` table, limit 1)
- Returns success/error status
- Logs timing information
- Requires no authentication (uses anon key)

### Frequency Recommendations

- **Every 5 minutes**: Good balance, prevents most idle timeouts
- **Every 10 minutes**: More conservative, still effective
- **Every 2 minutes**: Very aggressive, may be overkill

**Note:** Supabase free tier has rate limits, but a ping every 5 minutes is negligible.

## 🔧 Setup Instructions

### Step 1: Verify Environment Variables

Ensure these are set in Netlify:
- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Deploy the Function

The function is already created. Just deploy to Netlify:
```bash
git add netlify/functions/keep-alive.js
git commit -m "Add Supabase keep-alive function"
git push
```

### Step 3: Test Manually

Visit in browser or use curl:
```bash
curl https://your-site.netlify.app/keep-alive
```

Expected response:
```json
{
  "status": "success",
  "message": "Supabase connection is warm",
  "timestamp": "2025-01-XX...",
  "duration_ms": 123,
  "data_returned": true
}
```

### Step 4: Set Up Cron Job (External Service)

1. Go to [cron-job.org](https://cron-job.org) (or similar)
2. Create account → Add new cron job
3. Configure:
   - **Title:** Supabase Keep-Alive
   - **URL:** `https://your-site.netlify.app/keep-alive`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)
   - **Method:** GET
4. Save and activate

### Step 5: Monitor

Check Netlify function logs:
- Netlify Dashboard → Functions → keep-alive → Logs

You should see successful pings every 5 minutes.

## 🎯 Benefits

1. **Prevents Idle Timeouts**: Keeps Supabase connection pool warm
2. **Works 24/7**: Even when app is closed
3. **Complements Client Code**: Works alongside `ConnectionManager`
4. **Low Cost**: Negligible impact on Supabase usage
5. **Reliable**: Server-side is more reliable than client-side

## 🔄 How It Works Together

```
┌─────────────────┐
│  User Opens App │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  ConnectionManager (Client)     │
│  - Checks if stale (>5 min)     │
│  - Refreshes if needed          │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Keep-Alive (Server)             │
│  - Pings every 5 minutes        │
│  - Keeps connection warm         │
│  - Works even when app closed    │
└─────────────────────────────────┘
```

## 🐛 Troubleshooting

### Function Returns 500 Error
- Check Netlify environment variables are set
- Verify Supabase URL/key are correct
- Check Netlify function logs

### Cron Job Not Firing
- Verify cron service is active
- Check cron service logs
- Test URL manually first

### Still Getting Timeouts
- Reduce ping interval (e.g., every 3 minutes)
- Check Supabase status page
- Verify network connectivity

## 📊 Monitoring

You can enhance the keep-alive function to:
- Log metrics to a monitoring service
- Alert on failures
- Track response times

## ✅ Summary

**Recommended Approach:** Use **External Cron Service** (Option 2) with **cron-job.org**

1. ✅ Works with Netlify Free tier
2. ✅ No additional cost
3. ✅ Reliable and proven
4. ✅ Easy to set up
5. ✅ Complements existing `ConnectionManager`

The keep-alive function is already created and ready to deploy. Just set up the cron job and configure environment variables!

