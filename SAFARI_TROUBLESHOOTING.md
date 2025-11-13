# Safari/iOS Troubleshooting Guide

## Common Issues and Solutions

### 1. Blank White Screen

**Possible Causes:**
- JavaScript errors that Safari doesn't handle gracefully
- Service worker issues
- Cache problems
- HTTPS/SSL certificate issues

**Solutions:**

1. **Clear Safari Cache:**
   - Settings → Safari → Clear History and Website Data
   - Or: Settings → Safari → Advanced → Website Data → Remove All

2. **Check Console Errors:**
   - Connect iPhone to Mac
   - Open Safari on Mac → Develop → [Your iPhone] → [Your Site]
   - Check Console for JavaScript errors

3. **Try Private Browsing:**
   - Open Safari in Private mode
   - Navigate to your site
   - This bypasses cache

4. **Check HTTPS:**
   - Ensure site is using HTTPS (Netlify provides this automatically)
   - Safari requires HTTPS for many features

### 2. Page Loads But Features Don't Work

**Camera Issues:**
- Safari on iOS requires HTTPS for camera access
- User must grant permission when prompted
- Camera only works in Safari (not in other browsers on iOS)

**Image Picker Issues:**
- File input should work, but may look different on iOS
- Ensure you're using the web-compatible image picker

### 3. PWA Installation Issues

**To Install on iOS:**
1. Open site in Safari (not Chrome)
2. Tap Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. The app will appear on your home screen

**Note:** iOS doesn't support full PWA features like Android, but "Add to Home Screen" works.

### 4. JavaScript Compatibility

Safari on iOS may have issues with:
- Some ES6+ features (but Expo handles this)
- Service workers (should work on iOS 11.3+)
- WebAssembly (should work)

### 5. Debugging Steps

1. **Check Network Tab:**
   - Safari on Mac → Develop → [Your iPhone] → Network
   - Look for failed requests (red)

2. **Check Console:**
   - Safari on Mac → Develop → [Your iPhone] → Console
   - Look for JavaScript errors

3. **Check if Site is Accessible:**
   - Try accessing from different network (cellular vs WiFi)
   - Check if other devices can access it

4. **Check Build Output:**
   - Verify the build completed successfully on Netlify
   - Check Netlify build logs for errors

### 6. Quick Fixes to Try

1. **Hard Refresh:**
   - Close Safari completely
   - Reopen and navigate to site

2. **Restart iPhone:**
   - Sometimes helps clear stuck processes

3. **Check iOS Version:**
   - iOS 11.3+ required for service workers
   - iOS 13+ recommended for best PWA support

4. **Try Different Network:**
   - Switch from WiFi to Cellular or vice versa
   - Some networks block certain features

### 7. Common Error Messages

**"This site can't be reached"**
- Check URL is correct
- Check network connection
- Check if site is actually deployed

**"Safari cannot open the page"**
- Usually a network/DNS issue
- Try different network

**Blank screen with no errors:**
- Check console for JavaScript errors
- Check if service worker is blocking
- Try disabling service worker temporarily

### 8. Testing Checklist

- [ ] Site loads on Chrome desktop ✅
- [ ] Site loads on Safari desktop
- [ ] Site loads on Safari iOS
- [ ] HTTPS is working (green lock)
- [ ] No console errors
- [ ] Camera permission prompt appears
- [ ] Image picker works
- [ ] Can add to home screen

### 9. Get Help

If still not working:
1. Check Netlify build logs
2. Check Safari console (via Mac)
3. Share specific error messages
4. Share iOS version
5. Share what you see (blank screen, error, etc.)

