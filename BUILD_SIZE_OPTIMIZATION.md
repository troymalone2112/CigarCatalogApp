# Build Size Optimization Plan

## Current Status
- **Build Size:** 281MB
- **Assets Folder:** 2.9MB (68 cigar images = 2.3MB)
- **Main Contributors:** React Native framework + bundled dependencies

## 🎯 Optimization Strategy (Priority Order)

### 1. **Move Cigar Images to Supabase Storage** ⭐ HIGHEST IMPACT
**Current:** 68 images bundled via `require()` statements (2.3MB)
**Solution:** Upload images to Supabase Storage, load via remote URLs
**Impact:** Remove 2.3MB from bundle, enable unlimited images without size increase

**Steps:**
1. Upload all `assets/Cigar_Images/*` to Supabase Storage bucket `cigar-images`
2. Update database `cigars.image_url` to use Supabase Storage URLs
3. Remove `cigarImageManifest.ts` and all `require()` statements for cigar images
4. Update `CigarImageService` to only use remote URLs (already handles this!)

**Estimated Savings:** ~2.3MB + ability to add more images without bundle growth

### 2. **Optimize Remaining Assets**
**Current:** logo.png (196K), tobacco-leaves-bg.jpg (144K), icon.png (92K)
**Solution:** Compress images using tools like:
- `squoosh.app` (online)
- `imagemagick` or `sharp` (CLI)

**Estimated Savings:** ~100-150KB

### 3. **Enable Hermes Engine** (if not already)
**Check:** `app.json` - should have `"jsEngine": "hermes"` for smaller, faster builds
**Impact:** Smaller bundle size + faster runtime

### 4. **Remove Unused Dependencies**
**Check for:**
- `express` - likely not needed in React Native app
- `csv-parser` - only used in scripts?
- Any other dev-only dependencies in `dependencies` instead of `devDependencies`

**Estimated Savings:** Varies, but could be 5-10MB

### 5. **Code Splitting & Lazy Loading**
- Already implemented for screens (navigation)
- Consider lazy loading heavy services

## 📋 Implementation Plan

### Phase 1: Move Cigar Images (Quick Win)
1. Create Supabase Storage bucket `cigar-images` (public)
2. Upload all cigar images
3. Update database URLs
4. Remove image manifest

### Phase 2: Optimize Assets
1. Compress remaining images
2. Replace originals

### Phase 3: Dependency Cleanup
1. Audit dependencies
2. Move dev-only to devDependencies
3. Remove unused packages

## 🎯 Expected Results

**After Phase 1:** ~279MB (remove 2.3MB)
**After Phase 2:** ~279MB (minor savings)
**After Phase 3:** ~270-275MB (depends on what's removed)

**Note:** React Native framework itself is ~200MB+, so 270MB is actually reasonable for a full-featured app.





