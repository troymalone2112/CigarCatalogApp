import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionPlan } from '../services/subscriptionService';
import { PaymentService } from '../services/paymentService';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const {
    subscriptionStatus,
    subscriptionPlans,
    createPremiumSubscription,
    loading,
    refreshSubscription,
  } = useSubscription();
  const [selectedTab, setSelectedTab] = useState<'monthly' | 'yearly'>('yearly'); // Default to yearly
  const [purchasing, setPurchasing] = useState(false);
  const [revenueCatPackages, setRevenueCatPackages] = useState<PurchasesPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const monthlyPlan = subscriptionPlans.find((plan) => plan.name === 'Premium Monthly');
  const yearlyPlan = subscriptionPlans.find((plan) => plan.name === 'Premium Yearly');
  const currentPlan = selectedTab === 'monthly' ? monthlyPlan : yearlyPlan;
  const filteredPlanFeatures =
    currentPlan?.features?.filter((feature) => !/recommend/i.test(feature)) ?? [];

  // Load RevenueCat packages on component mount
  useEffect(() => {
    loadRevenueCatPackages();
  }, []);

  const loadRevenueCatPackages = async () => {
    try {
      setLoadingPackages(true);
      console.log('🔄 Loading RevenueCat packages via PaymentService...');

      // Get packages through PaymentService (centralized SDK access)
      const packages = await PaymentService.getRawPackages();

      if (packages && packages.length > 0) {
        setRevenueCatPackages(packages);
        console.log(
          '📦 Available packages loaded:',
          packages.map((pkg) => ({
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            title: pkg.product.title,
            price: pkg.product.priceString,
          })),
        );
      } else {
        console.warn('⚠️ No packages available from PaymentService');
      }
    } catch (error) {
      console.error('❌ Failed to load RevenueCat packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setPurchasing(true);
      console.log('🔄 Restoring purchases...');

      const restoreResult = await PaymentService.restorePurchases();
      console.log('✅ Restore result:', restoreResult);

      // Check if restore was successful
      const hasAccess = restoreResult.success;

      if (hasAccess) {
        // Sync with our database
        const { supabase } = await import('../services/supabaseService');
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // PaymentService handles database sync automatically
          console.log('✅ Database sync handled by PaymentService webhook');
        }

        Alert.alert(
          'Purchases Restored!',
          'Your premium subscription has been restored. Welcome back!',
          [{ text: 'Continue', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      console.error('❌ Restore failed:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchase = async () => {
    console.log('🚀 Purchase button pressed - starting purchase flow...');

    // Double-tap protection at UI level
    if (purchasing) {
      console.warn('⚠️ Purchase already in progress - ignoring button tap');
      return;
    }

    if (!currentPlan) {
      console.error('❌ No current plan selected');
      Alert.alert('Error', 'No plan selected');
      return;
    }

    console.log('📋 Selected plan:', currentPlan.name);
    console.log('📋 Plan details:', {
      name: currentPlan.name,
      type: selectedTab,
    });

    try {
      setPurchasing(true);
      console.log('🔄 Purchase state set to true (UI guard enabled)');

      // PaymentService handles initialization automatically
      console.log('🔧 PaymentService will initialize RevenueCat on-demand...');

      // Check if RevenueCat packages are available
      if (!revenueCatPackages || revenueCatPackages.length === 0) {
        console.error('❌ No RevenueCat packages available');
        Alert.alert('Error', 'Subscription packages not available. Please try again later.');
        return;
      }

      // Debug: Log available packages
      console.log(
        '🔍 Available RevenueCat packages:',
        revenueCatPackages.map((pkg) => ({
          identifier: pkg.identifier,
          title: pkg.product.title,
          price: pkg.product.priceString,
        })),
      );

      console.log('🔍 Looking for plan:', currentPlan.name);

      // Find the corresponding RevenueCat package
      const revenueCatPackage = revenueCatPackages.find((pkg) => {
        if (currentPlan.name === 'Premium Monthly') {
          // Match by package identifier or product identifier
          return (
            pkg.identifier === '$rc_monthly' || pkg.product.identifier === 'premium_monthly_2025'
          );
        } else if (currentPlan.name === 'Premium Yearly') {
          // Match by package identifier or product identifier
          return (
            pkg.identifier === '$rc_annual' || pkg.product.identifier === 'premium_yearly_2025'
          );
        }
        return false;
      });

      if (!revenueCatPackage) {
        console.error('❌ Package not found for plan:', currentPlan.name);
        console.error(
          '❌ Available packages:',
          revenueCatPackages.map((p) => p.identifier),
        );
        Alert.alert('Error', 'Subscription package not available. Please try again later.');
        return;
      }

      console.log('✅ Found matching package:', revenueCatPackage.identifier);

      console.log('🛒 Purchasing package:', revenueCatPackage.identifier);
      console.log('📦 Package details:', {
        identifier: revenueCatPackage.identifier,
        productId: revenueCatPackage.product.identifier,
        price: revenueCatPackage.product.priceString,
        currencyCode: revenueCatPackage.product.currencyCode,
      });

      // Make the purchase through PaymentService to ensure single flow
      const purchaseResult = await PaymentService.purchasePackage(revenueCatPackage as any);

      console.log('📊 Purchase result:', purchaseResult);

      if (!purchaseResult.success || !purchaseResult.customerInfo) {
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      // If we reach here, the purchase was successful
      const { supabase } = await import('../services/supabaseService');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not found');
      }

      console.log('✅ Purchase successful - starting immediate refresh...');

      // STEP 1: Immediate sync to Supabase from RevenueCat customer info
      // This writes premium status directly to DB for instant UI update
      console.log('⚡ Step 1: Immediately syncing RevenueCat customer info to Supabase...');
      const { RevenueCatService } = await import('../services/revenueCatService');
      await RevenueCatService.syncSubscriptionWithSupabase(purchaseResult.customerInfo);
      console.log('✅ Immediate sync complete - premium status written to database');

      // STEP 2: Clear cache and refresh subscription context
      // This ensures UI shows premium status immediately
      console.log('🔄 Step 2: Clearing cache and refreshing subscription context...');
      const { DatabaseSubscriptionManager } = await import(
        '../services/databaseSubscriptionManager'
      );
      DatabaseSubscriptionManager.clearUserCache(user.id);
      await refreshSubscription();
      console.log('✅ Subscription context refreshed');

      // STEP 3: Brief polling to verify webhook also processed (redundancy check)
      // The webhook will also update the DB, but we already wrote it in Step 1
      // This is just to confirm webhook is working (logs only, doesn't block UI)
      console.log('⏳ Step 3: Verifying webhook processing (non-blocking)...');
      setTimeout(async () => {
        try {
          const { SubscriptionService } = await import('../services/subscriptionService');
          const status = await SubscriptionService.checkSubscriptionStatus(user.id);
          if (status.isPremium) {
            console.log('✅ Webhook verification: Premium status confirmed in database');
          }
        } catch (error) {
          // Non-critical - we already have premium status from Step 1
          console.warn('⚠️ Webhook verification warning (non-critical):', error);
        }
      }, 2000); // Check after 2 seconds (non-blocking)

      // Show success message and navigate back
      // Note: iOS may show its own success message, so we keep this brief
      Alert.alert('Welcome to Premium!', 'Your subscription is now active!', [
        { text: 'Continue', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Purchase error:', error);
      Alert.alert('Purchase Failed', 'Please try again later');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Pricing Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.plansTitle}>Choose Your Plan</Text>

          {loadingPackages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C2D12" />
              <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
          ) : (
            <View style={styles.plansContainer}>
              {/* Tab Selector */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, selectedTab === 'monthly' && styles.activeTab]}
                  onPress={() => setSelectedTab('monthly')}
                >
                  <Text style={[styles.tabText, selectedTab === 'monthly' && styles.activeTabText]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, selectedTab === 'yearly' && styles.activeTab]}
                  onPress={() => setSelectedTab('yearly')}
                >
                  <Text style={[styles.tabText, selectedTab === 'yearly' && styles.activeTabText]}>
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Plan Display */}
              {currentPlan && (
                <View style={styles.planDisplay}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{currentPlan.name.replace('Premium ', '')}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        $
                        {selectedTab === 'monthly'
                          ? currentPlan.price_monthly
                          : currentPlan.price_yearly}
                      </Text>
                      <Text style={styles.period}>
                        /{selectedTab === 'monthly' ? 'month' : 'year'}
                      </Text>
                    </View>
                    {selectedTab === 'yearly' && <Text style={styles.savings}>Save 1 month!</Text>}
                  </View>

                  <View style={styles.featuresContainer}>
                    {filteredPlanFeatures.slice(0, 4).map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#DC851F" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Premium Access</Text>

          <View style={styles.benefitsList}>
              {[
              {
                icon: 'camera',
                title: 'Unlimited AI Recognition',
                desc: 'Identify any cigar instantly',
              },
              {
                icon: 'archive',
                title: 'Unlimited Inventory',
                desc: 'Track your entire collection',
              },
              { icon: 'book', title: 'Detailed Journal', desc: 'Record every smoking experience' },
              {
                icon: 'analytics',
                title: 'Advanced Analytics',
                desc: 'Insights into your preferences',
              },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={20} color="#DC851F" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Purchase Button */}
        {currentPlan && (
          <TouchableOpacity
            style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <Text style={styles.purchaseButtonText}>
              {purchasing
                ? 'Processing...'
                : `Start Premium - $${selectedTab === 'monthly' ? currentPlan.price_monthly : currentPlan.price_yearly}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Restore Purchases Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={purchasing}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Debug Button - Show in development builds only */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('🔍 Debug button pressed - checking RevenueCat status...');

                // Show subscription status from our database
                const debugSummary = `
Debug Info:
• Subscription Status: ${subscriptionStatus?.hasAccess ? 'Active' : 'Inactive'}
• Is Premium: ${subscriptionStatus?.isPremium ? 'Yes' : 'No'}
• Is Trial Active: ${subscriptionStatus?.isTrialActive ? 'Yes' : 'No'}
• Payment System: Using PaymentService with on-demand initialization
                `;

                Alert.alert('Payment Debug Info', debugSummary, [{ text: 'OK' }]);
              } catch (error) {
                console.error('❌ Debug failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                Alert.alert('Debug Error', `Failed to get debug information: ${errorMessage}`);
              }
            }}
            disabled={purchasing}
          >
            <Text style={styles.debugButtonText}>Debug Subscription Status</Text>
          </TouchableOpacity>
        )}

        {/* RevenueCat Migration Button (Development Only) */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: '#dc3545' }]}
            onPress={() => navigation.navigate('Settings' as never)}
            disabled={purchasing}
          >
            <Text style={styles.debugButtonText}>RevenueCat Migration Tool</Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Cancel anytime • Secure payment • Instant access</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  tobaccoBackgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#555555',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 133, 31, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  plansSection: {
    marginBottom: 24,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#DC851F',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  planDisplay: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DC851F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#555555',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  popularPlan: {
    borderColor: '#DC851F',
    backgroundColor: 'rgba(220, 133, 31, 0.1)',
  },
  selectedPlan: {
    borderColor: '#DC851F',
    backgroundColor: 'rgba(220, 133, 31, 0.15)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#DC851F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC851F',
  },
  period: {
    fontSize: 16,
    color: '#CCCCCC',
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    color: '#DC851F',
    fontWeight: '600',
    marginBottom: 12,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#CCCCCC',
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#DC851F',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#8B5A2B',
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DC851F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  debugButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 12,
  },
});
