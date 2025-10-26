// Debug script to understand the RevenueCat webhook date issue

console.log('🔍 Debugging RevenueCat webhook date processing...');

// Simulate a RevenueCat webhook payload
const mockWebhookPayload = {
  api_version: "1.0",
  event: {
    type: "INITIAL_PURCHASE",
    app_user_id: "test-user-123",
    product_id: "premium_monthly",
    period_type: "NORMAL",
    purchased_at_ms: "1698123456789", // Example timestamp
    expiration_at_ms: "1700715456789", // Example timestamp (30 days later)
    store: "APP_STORE",
    is_trial_period: false,
    auto_renew_status: true,
    original_transaction_id: "1000000123456789",
    transaction_id: "1000000123456789",
    environment: "SANDBOX"
  }
};

console.log('📊 Mock webhook payload:', JSON.stringify(mockWebhookPayload, null, 2));

// Extract the timestamps
const { event } = mockWebhookPayload;
const { purchased_at_ms, expiration_at_ms } = event;

console.log('\n⏰ Timestamp processing:');
console.log('Purchased at (ms):', purchased_at_ms);
console.log('Expiration at (ms):', expiration_at_ms);

// Convert timestamps (this is what the webhook does)
const purchased_at = new Date(parseInt(purchased_at_ms));
const expiration_at = new Date(parseInt(expiration_at_ms));

console.log('\n📅 Converted dates:');
console.log('Purchased at:', purchased_at.toISOString());
console.log('Expiration at:', expiration_at.toISOString());

// Calculate the difference
const diffMs = expiration_at.getTime() - purchased_at.getTime();
const diffMinutes = Math.round(diffMs / (1000 * 60));
const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

console.log('\n⏰ Time difference:');
console.log('Minutes:', diffMinutes);
console.log('Days:', diffDays);

// Check if this is the issue
if (diffMinutes < 10) {
  console.log('🚨 ISSUE FOUND: Dates are too close together!');
  console.log('This suggests the timestamps from RevenueCat are incorrect or being processed wrong.');
} else {
  console.log('✅ Dates look correct for this example');
}

console.log('\n🔍 Potential issues:');
console.log('1. RevenueCat might be sending incorrect timestamps');
console.log('2. The webhook might be processing timestamps incorrectly');
console.log('3. The product configuration in RevenueCat might be wrong');
console.log('4. The webhook might be receiving test data with short durations');

console.log('\n💡 Solutions:');
console.log('1. Check RevenueCat dashboard for product configuration');
console.log('2. Add logging to webhook to see actual timestamps received');
console.log('3. Verify the product IDs match between app and RevenueCat');
console.log('4. Test with a real purchase to see actual timestamps');
