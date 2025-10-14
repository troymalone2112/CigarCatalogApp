# RevenueCat Setup Guide 📱💳

## Step 1: Create RevenueCat Account
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign up for a free account
3. Create a new project for your Cigar Catalog App

## Step 2: Configure App Store Connect (iOS)
1. **In App Store Connect:**
   - Go to "My Apps" > Your App > "In-App Purchases"
   - Create two auto-renewable subscriptions:
     - **Product ID:** `premium_monthly`
     - **Reference Name:** Premium Monthly
     - **Price:** $9.99/month
     - **Subscription Group:** Create new group "Premium Subscriptions"
     
     - **Product ID:** `premium_yearly`
     - **Reference Name:** Premium Yearly  
     - **Price:** $109.99/year
     - **Subscription Group:** Same "Premium Subscriptions" group

2. **Set up Subscription Groups:**
   - Make sure both products are in the same subscription group
   - Set the yearly as the higher tier (better value)

## Step 3: Configure Google Play Console (Android)
1. **In Google Play Console:**
   - Go to "Monetization" > "Subscriptions"
   - Create two subscriptions:
     - **Product ID:** `premium_monthly`
     - **Name:** Premium Monthly
     - **Price:** $9.99/month
     
     - **Product ID:** `premium_yearly`
     - **Name:** Premium Yearly
     - **Price:** $109.99/year

2. **Set up Base Plan:**
   - Create a base plan for each subscription
   - Set the pricing for your target countries

## Step 4: Configure RevenueCat Dashboard
1. **Add Apps:**
   - Go to "Apps" in RevenueCat dashboard
   - Add your iOS app (bundle ID from App Store Connect)
   - Add your Android app (package name from Google Play Console)

2. **Create Products:**
   - Go to "Products" tab
   - Add the two products:
     - `premium_monthly` - $9.99/month
     - `premium_yearly` - $109.99/year

3. **Create Entitlements:**
   - Go to "Entitlements" tab
   - Create entitlement: `premium_features`
   - Attach both products to this entitlement

4. **Create Offerings:**
   - Go to "Offerings" tab
   - Create offering: `default`
   - Add both products to this offering

## Step 5: Get API Key
1. **In RevenueCat Dashboard:**
   - Go to "Project Settings" > "API Keys"
   - Copy your API key (platform-agnostic)

2. **Update Configuration:**
   - Open `src/services/revenueCatService.ts`
   - Replace `YOUR_REVENUECAT_API_KEY_HERE` with your actual API key

## Step 6: Test Configuration
1. **Build and test on device:**
   ```bash
   npm run ios  # or npm run android
   ```

2. **Check console logs:**
   - Look for "✅ RevenueCat initialized successfully"
   - Test purchase flow in sandbox environment

## Step 7: Test Purchases
1. **iOS Testing:**
   - Create sandbox test user in App Store Connect
   - Sign out of App Store on device
   - Sign in with sandbox user
   - Test purchases in your app

2. **Android Testing:**
   - Add test account in Google Play Console
   - Install app on test device
   - Test purchases with test account

## Important Notes ⚠️

### Product ID Consistency
- Product IDs in RevenueCat must exactly match those in App Store Connect/Google Play Console
- Current product IDs: `premium_monthly`, `premium_yearly`

### Entitlement Setup
- Users get access to `premium_features` entitlement when they subscribe
- This controls what features they can access in your app

### Testing Environment
- Always test in sandbox/test environment first
- RevenueCat provides webhook testing for server-side validation

### Production Deployment
- Ensure all products are approved in app stores before production
- Test with real payment methods in staging environment

## Troubleshooting 🔧

### Common Issues:
1. **"API key not configured" error:**
   - Make sure you've updated the API key in `src/services/revenueCatService.ts`

2. **Products not found:**
   - Verify product IDs match exactly between RevenueCat and app stores
   - Ensure products are approved and active

3. **Purchases failing:**
   - Check sandbox/test user setup
   - Verify app store credentials are correct

### Debug Mode:
- RevenueCat logs are enabled in development
- Check console for detailed error messages
- Use RevenueCat dashboard to monitor purchase events

## Next Steps 🚀
After completing this setup:
1. Update subscription plans in database
2. Implement feature gating
3. Create upgrade prompts
4. Test complete subscription flow
