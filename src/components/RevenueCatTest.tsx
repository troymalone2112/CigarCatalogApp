import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RevenueCatService } from '../services/revenueCatService';
import { useAuth } from '../contexts/AuthContext';

export const RevenueCatTest: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const testRevenueCat = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      setLoading(true);

      console.log('🧪 Testing RevenueCat API connection...');

      // Test 1: Get offerings (this will test the API key)
      console.log('📦 Testing offerings...');
      const offerings = await RevenueCatService.getOfferings();
      console.log('✅ Offerings retrieved:', offerings);

      // Test 2: Get customer info
      console.log('👤 Testing customer info...');
      const customerInfo = await RevenueCatService.getCustomerInfo();
      console.log('✅ Customer info:', customerInfo);

      // Test 3: Check subscription status
      console.log('🔍 Testing subscription status...');
      const subscriptionStatus = await RevenueCatService.getSubscriptionStatus();
      console.log('✅ Subscription status:', subscriptionStatus);

      // Test 4: Sync with database
      console.log('🔄 Testing database sync...');
      const syncedStatus = await RevenueCatService.syncSubscriptionStatus(user.id);
      console.log('✅ Synced status:', syncedStatus);

      setStatus({
        offerings: offerings.map((offering) => ({
          identifier: offering.identifier,
          packages: offering.availablePackages.map((pkg) => ({
            identifier: pkg.identifier,
            title: pkg.product.title,
            price: pkg.product.priceString,
          })),
        })),
        customerInfo,
        subscriptionStatus,
        syncedStatus,
      });

      Alert.alert(
        'Success',
        `RevenueCat is working!\n\nFound ${offerings.length} offerings with ${offerings.reduce((total, offering) => total + offering.availablePackages.length, 0)} packages.`,
      );
    } catch (error) {
      console.error('❌ RevenueCat test failed:', error);
      Alert.alert('Error', `RevenueCat test failed:\n\n${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const forceUserMigration = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      setLoading(true);

      console.log('🔄 Force migrating RevenueCat user ID...');

      const success = await RevenueCatService.forceUserMigration(user.id);

      if (success) {
        Alert.alert(
          'Success',
          'User ID migration completed! Your purchases should now sync correctly.',
        );

        // Refresh the status
        await testRevenueCat();
      } else {
        Alert.alert('Error', 'User ID migration failed. Check logs for details.');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      Alert.alert('Error', `Migration failed:\n\n${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to test RevenueCat</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RevenueCat Test</Text>

      <TouchableOpacity style={styles.button} onPress={testRevenueCat} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test RevenueCat Connection'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.migrationButton]}
        onPress={forceUserMigration}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Migrating...' : 'Force User ID Migration'}
        </Text>
      </TouchableOpacity>

      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Test Results:</Text>

          <Text style={styles.statusText}>Offerings: {status.offerings?.length || 0}</Text>
          {status.offerings?.map((offering, index) => (
            <View key={index} style={styles.offeringContainer}>
              <Text style={styles.offeringTitle}>Offering: {offering.identifier}</Text>
              {offering.packages?.map((pkg, pkgIndex) => (
                <Text key={pkgIndex} style={styles.packageText}>
                  • {pkg.identifier}: {pkg.title} ({pkg.price})
                </Text>
              ))}
            </View>
          ))}

          <Text style={styles.statusText}>
            Customer ID: {status.customerInfo?.originalAppUserId || 'N/A'}
          </Text>
          <Text style={styles.statusText}>
            Has Access: {status.syncedStatus?.hasAccess ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.statusText}>Status: {status.syncedStatus?.status || 'Unknown'}</Text>
          <Text style={styles.statusText}>
            Days Remaining: {status.syncedStatus?.daysRemaining || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  text: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#DC851F',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  migrationButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 6,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  offeringContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  offeringTitle: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 2,
  },
});
