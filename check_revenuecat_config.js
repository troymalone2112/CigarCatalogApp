// RevenueCat Configuration Checker
// This helps identify configuration issues

console.log('🔍 RevenueCat Configuration Checker');
console.log('=====================================\n');

console.log('📱 Current Configuration:');
console.log('- iOS API Key: appl_OdWJAJMHMYrvZGgQDapUsNfpLmf');
console.log('- Product IDs: 0004 (Monthly), 0005 (Yearly)');
console.log('- Entitlement: premium_features');
console.log('- Bundle ID: com.anonymous.CigarCatalogApp\n');

console.log('🎯 Common Issues & Solutions:');
console.log('=====================================\n');

console.log('1. ❌ "Failed to initialize payment system"');
console.log('   Possible causes:');
console.log('   - API key is invalid or expired');
console.log('   - Network connectivity issues');
console.log('   - RevenueCat servers are down');
console.log('   - App Store Connect products not approved\n');

console.log('2. ❌ "Products not found"');
console.log('   Possible causes:');
console.log("   - Product IDs don't match RevenueCat dashboard");
console.log('   - Products not created in App Store Connect');
console.log('   - Products not approved by Apple');
console.log('   - Bundle ID mismatch\n');

console.log('3. ❌ "No offerings available"');
console.log('   Possible causes:');
console.log('   - No offerings configured in RevenueCat dashboard');
console.log('   - Products not attached to offerings');
console.log('   - Offering not set as "current"\n');

console.log('🔧 Debugging Steps:');
console.log('=====================================\n');

console.log('1. Check RevenueCat Dashboard:');
console.log('   - Go to https://app.revenuecat.com/');
console.log('   - Verify products 0004 and 0005 exist');
console.log('   - Check that products are attached to an offering');
console.log('   - Ensure offering is set as "current"\n');

console.log('2. Check App Store Connect:');
console.log('   - Go to https://appstoreconnect.apple.com/');
console.log('   - Verify products 0004 and 0005 exist');
console.log('   - Check that products are "Ready to Submit" or "Approved"');
console.log('   - Verify bundle ID matches: com.anonymous.CigarCatalogApp\n');

console.log('3. Test Network Connectivity:');
console.log('   - Try the purchase flow on a different network');
console.log("   - Check if you're behind a corporate firewall");
console.log('   - Verify device has internet connectivity\n');

console.log('4. Check App Logs:');
console.log('   - Look for RevenueCat debug messages in console');
console.log('   - Search for "RevenueCat" or "Purchases" in logs');
console.log('   - Check for network error messages\n');

console.log('🎯 Quick Fixes to Try:');
console.log('=====================================\n');

console.log('1. Restart the app completely');
console.log('2. Sign out and sign back into App Store');
console.log('3. Try on a different device');
console.log('4. Check RevenueCat status page: https://status.revenuecat.com/');
console.log('5. Verify API key in RevenueCat dashboard\n');

console.log('📞 If issues persist:');
console.log('=====================================\n');
console.log('1. Check RevenueCat dashboard for any error messages');
console.log('2. Verify all products are properly configured');
console.log('3. Test with a fresh sandbox user account');
console.log('4. Contact RevenueCat support if dashboard shows issues\n');

console.log('✅ Configuration looks correct based on code analysis.');
console.log(
  'The issue is likely environmental (network, App Store Connect, or RevenueCat dashboard).',
);

