# 💳 Payment Integration Example

## Using PaymentService for Subscription Purchases

Here's how to implement subscription purchases using the new `PaymentService`:

### **Purchase Screen Implementation**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { PaymentService, PaymentOffering } from '../services/paymentService';
import { DatabaseSubscriptionManager } from '../services/databaseSubscriptionManager';
import { useAuth } from '../contexts/AuthContext';

export default function PurchaseScreen() {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState<PaymentOffering[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);

      // RevenueCat initializes on-demand here (not on app startup!)
      const availableOfferings = await PaymentService.getOfferings();
      setOfferings(availableOfferings);

    } catch (error) {
      console.error('Error loading offerings:', error);
      Alert.alert('Error', 'Unable to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string, offeringId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to purchase a subscription');
      return;
    }

    try {
      setPurchasing(true);

      // Set user ID for RevenueCat (links purchase to user)
      await PaymentService.setUserId(user.id);

      // Process the purchase
      const result = await PaymentService.purchasePackage(packageId, offeringId);

      if (result.success) {
        // Sync with database (usually handled by webhooks, but good backup)
        if (result.customerInfo) {
          await PaymentService.syncWithDatabase(user.id, result.customerInfo);
        }

        // Force refresh subscription status to update UI immediately
        await DatabaseSubscriptionManager.refreshSubscriptionStatus(user.id);

        Alert.alert('Success!', 'Your subscription has been activated. Enjoy premium features!');

        // Navigate back or to premium features
        // navigation.goBack();

      } else {
        Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'An unexpected error occurred');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to restore purchases');
      return;
    }

    try {
      setPurchasing(true);

      // Set user ID for RevenueCat
      await PaymentService.setUserId(user.id);

      // Restore purchases
      const result = await PaymentService.restorePurchases();

      if (result.success && result.customerInfo) {
        // Sync with database
        await PaymentService.syncWithDatabase(user.id, result.customerInfo);

        // Refresh subscription status
        await DatabaseSubscriptionManager.refreshSubscriptionStatus(user.id);

        Alert.alert('Success!', 'Your purchases have been restored');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases found for this account');
      }

    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading subscription plans...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Premium Subscription
      </Text>

      {offerings.map((offering) => (
        <View key={offering.identifier} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {offering.serverDescription}
          </Text>

          {offering.packages.map((pkg) => (
            <View key={pkg.identifier} style={{
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 15,
              marginTop: 10,
              borderRadius: 8
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {pkg.product.description}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginVertical: 5 }}>
                {pkg.product.priceString}
              </Text>

              <Button
                title={purchasing ? 'Processing...' : 'Subscribe'}
                onPress={() => handlePurchase(pkg.identifier, offering.identifier)}
                disabled={purchasing}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={{ marginTop: 30 }}>
        <Button
          title="Restore Purchases"
          onPress={handleRestorePurchases}
          disabled={purchasing}
        />
      </View>

      {purchasing && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color="#white" />
          <Text style={{ color: 'white', marginTop: 10 }}>
            Processing purchase...
          </Text>
        </View>
      )}
    </View>
  );
}
```

### **Key Benefits of This Implementation**

1. **On-Demand RevenueCat**: Only initializes when user actually wants to purchase
2. **Error Handling**: Comprehensive error handling for all failure scenarios
3. **Database Sync**: Automatically syncs RevenueCat state with database
4. **UI Updates**: Immediately updates subscription state in the app
5. **Restore Purchases**: Full restore functionality for users switching devices

### **Subscription Status Checking (Anywhere in App)**

```typescript
// Check if user has access (uses database, not RevenueCat)
const hasAccess = await DatabaseSubscriptionManager.hasAccess(userId, 'any');

// Get detailed subscription info (instant from database)
const status = await DatabaseSubscriptionManager.getSubscriptionStatus(userId);

// Check specific access levels
const isPremium = await DatabaseSubscriptionManager.hasAccess(userId, 'premium');
const isOnTrial = await DatabaseSubscriptionManager.hasAccess(userId, 'trial');
```

### **Admin/Support Functions**

```typescript
// Give user a trial (for support/marketing)
await DatabaseSubscriptionManager.createTrial(userId, 14); // 14-day trial

// Manually update subscription (for admin overrides)
await DatabaseSubscriptionManager.updateSubscriptionStatus(userId, {
  status: 'active',
  isPremium: true,
  subscriptionEndDate: new Date('2024-12-31'),
});

// Check subscription details for support
const plan = await DatabaseSubscriptionManager.getSubscriptionPlan(userId);
```

This implementation gives you **full control** over subscriptions while using RevenueCat only for what it does best - processing payments!

