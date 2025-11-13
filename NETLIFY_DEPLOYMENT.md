# Netlify Deployment Guide for Cigar Catalog PWA

This guide will walk you through deploying your Cigar Catalog App as a Progressive Web App on Netlify.

## Prerequisites

1. A Netlify account (free tier works fine) - sign up at https://www.netlify.com
2. Your domain (optional - Netlify provides a free subdomain)
3. Your environment variables ready

## Step 1: Prepare Your Repository

Make sure your code is committed and pushed to GitHub/GitLab/Bitbucket:

```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push
```

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended for first time)

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Sign in or create an account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect to your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   - **Build command:** `npm install && npm run build:web`
   - **Publish directory:** `web-build`
   - **Node version:** `18` (or latest LTS)
   
   ⚠️ **Important:** The build settings are already configured in `netlify.toml`, so Netlify should auto-detect them. Just verify they match above.

4. **Add Environment Variables**
   Click "Show advanced" → "New variable" and add:
   
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
   EXPO_PUBLIC_PERPLEXITY_API_KEY=your_perplexity_key
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_key
   ```

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete (usually 2-5 minutes)

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow prompts

4. **Set Environment Variables**
   ```bash
   netlify env:set EXPO_PUBLIC_SUPABASE_URL "your_supabase_url"
   netlify env:set EXPO_PUBLIC_SUPABASE_ANON_KEY "your_supabase_anon_key"
   netlify env:set EXPO_PUBLIC_OPENAI_API_KEY "your_openai_key"
   netlify env:set EXPO_PUBLIC_PERPLEXITY_API_KEY "your_perplexity_key"
   netlify env:set EXPO_PUBLIC_REVENUECAT_IOS_KEY "your_revenuecat_key"
   ```

5. **Deploy**
   ```bash
   npm run build:web
   netlify deploy --prod
   ```

## Step 3: Configure Custom Domain (Optional)

1. **In Netlify Dashboard**
   - Go to your site → "Domain settings"
   - Click "Add custom domain"

2. **Add Your Domain**
   - Enter your domain (e.g., `cigarcatalog.com`)
   - Follow DNS configuration instructions

3. **DNS Configuration**
   - Add a CNAME record pointing to your Netlify site
   - Or add an A record with Netlify's IP addresses
   - Wait for DNS propagation (can take up to 48 hours, usually much faster)

4. **SSL Certificate**
   - Netlify automatically provisions SSL certificates via Let's Encrypt
   - HTTPS is required for camera access on web!

## Step 4: Verify Deployment

1. **Check Your Site**
   - Visit your Netlify URL (e.g., `your-site.netlify.app`)
   - Or your custom domain

2. **Test Features**
   - ✅ Login/Signup
   - ✅ Camera access (requires HTTPS)
   - ✅ Image picker
   - ✅ Cigar recognition
   - ✅ All app features

## Step 5: PWA Configuration (Already Set Up)

The app is configured as a PWA:
- ✅ Service worker for offline support
- ✅ Web manifest for installability
- ✅ Responsive design
- ✅ HTTPS required (Netlify provides automatically)

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Ensure all environment variables are set
- Verify Node version matches (should be 18+)

### Camera Not Working
- **Must use HTTPS** - Netlify provides this automatically
- Check browser console for errors
- Ensure camera permissions are granted

### Environment Variables Not Working
- Variables must start with `EXPO_PUBLIC_` to be available in browser
- Redeploy after adding/changing variables
- Check Netlify build logs to verify variables are set

### Routing Issues
- The `netlify.toml` includes SPA redirect rules
- All routes redirect to `index.html` for client-side routing

## Continuous Deployment

Once connected to Git:
- Every push to your main branch automatically deploys
- Pull requests get preview deployments
- You can configure branch-specific settings

## Next Steps

1. Test thoroughly on mobile devices
2. Add PWA install prompts (optional enhancement)
3. Configure analytics (optional)
4. Set up form handling if needed
5. Configure redirects for specific routes

## Support

- Netlify Docs: https://docs.netlify.com
- Expo Web: https://docs.expo.dev/workflow/web/
- Your build logs: Available in Netlify dashboard

