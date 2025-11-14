# Getting Full-Screen PWA Experience on iOS

## ⚠️ Important: iOS Safari Limitation

**Safari on iOS will ALWAYS show browser UI (address bar, bottom navigation) when viewing a website normally.** This is an Apple limitation, not a bug in your app.

## ✅ The ONLY Way to Get Full-Screen (No Safari Bars)

You **MUST** add the app to your home screen and open it from there:

### Step-by-Step Instructions:

1. **Open the site in Safari** (not Chrome or other browsers)
   - Go to: `https://cigarapp.netlify.app`

2. **Tap the Share button** (square with arrow icon at bottom)

3. **Scroll down** in the share menu

4. **Tap "Add to Home Screen"**

5. **Tap "Add"** (you can rename it if you want)

6. **Close Safari completely**

7. **Open the app from your home screen** (the new icon you just added)

8. **Now you'll have full-screen!** No Safari bars, no address bar, just your app.

## 🔍 How to Verify You're in Standalone Mode

When opened from home screen, you should see:
- ✅ No address bar at the top
- ✅ No bottom Safari navigation bar
- ✅ Full-screen app experience
- ✅ Status bar only (time, battery, etc.)

## 🚫 What Won't Work

- Opening from Safari bookmarks → Still shows Safari UI
- Opening from Safari history → Still shows Safari UI  
- Opening from a link → Still shows Safari UI
- **Only opening from home screen icon works!**

## 💡 Why This Happens

Apple designed iOS Safari this way for security and user control. They want users to always know they're in a browser. The only exception is when you explicitly "install" the app by adding it to the home screen.

## 🎯 Best User Experience

1. Show the "Add to Home Screen" banner (already implemented)
2. Guide users through the process
3. Once added, the experience is native-like

## 📱 Testing Checklist

- [ ] Site loads in Safari ✅
- [ ] Banner appears prompting to add to home screen
- [ ] Can add to home screen successfully
- [ ] App opens from home screen icon
- [ ] No Safari UI when opened from home screen
- [ ] Full-screen experience works

## 🔧 Technical Details

The app detects standalone mode using:
- `window.navigator.standalone` (iOS)
- `display-mode: standalone` media query
- Banner only shows when NOT in standalone mode

The CSS we've added minimizes visible UI when browsing normally, but full removal requires home screen installation.

