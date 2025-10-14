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
import { RevenueCatService } from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { subscriptionStatus, subscriptionPlans, createPremiumSubscription, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [revenueCatPackages, setRevenueCatPackages] = useState<PurchasesPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const monthlyPlan = subscriptionPlans.find(plan => plan.name === 'Premium Monthly');
  const yearlyPlan = subscriptionPlans.find(plan => plan.name === 'Premium Yearly');

  // Load RevenueCat packages on component mount
  useEffect(() => {
    loadRevenueCatPackages();
  }, []);

  const loadRevenueCatPackages = async () => {
    try {
      setLoadingPackages(true);
      const offerings = await RevenueCatService.getOfferings();
      console.log('📦 RevenueCat offerings loaded:', offerings);
      
      // Extract all packages from all offerings
      const allPackages = offerings.flatMap(offering => offering.availablePackages);
      console.log('📦 All available packages:', allPackages.map(pkg => ({
        identifier: pkg.identifier,
        title: pkg.product.title,
        price: pkg.product.priceString
      })));
      
      setRevenueCatPackages(allPackages);
    } catch (error) {
      console.error('❌ Failed to load RevenueCat packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    try {
      setPurchasing(true);
      
      // Debug: Log available packages
      console.log('🔍 Available RevenueCat packages:', revenueCatPackages.map(pkg => ({
        identifier: pkg.identifier,
        title: pkg.product.title,
        price: pkg.product.priceString
      })));
      
      console.log('🔍 Looking for plan:', plan.name);
      
      // Find the corresponding RevenueCat package
      const revenueCatPackage = revenueCatPackages.find(pkg => {
        if (plan.name === 'Premium Monthly') {
          return pkg.identifier === '0004';
        } else if (plan.name === 'Premium Yearly') {
          return pkg.identifier === '0005';
        }
        return false;
      });

      if (!revenueCatPackage) {
        console.error('❌ Package not found for plan:', plan.name);
        console.error('❌ Available packages:', revenueCatPackages.map(p => p.identifier));
        Alert.alert('Error', 'Subscription package not available. Please try again later.');
        return;
      }
      
      console.log('✅ Found matching package:', revenueCatPackage.identifier);

      console.log('🛒 Purchasing package:', revenueCatPackage.identifier);
      
      // Make the purchase through RevenueCat
      const purchaseResult = await RevenueCatService.purchasePackage(revenueCatPackage);
      
      if (purchaseResult.success) {
        // Sync with our database
        await RevenueCatService.syncSubscriptionStatus();
        
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription has been activated. Enjoy unlimited access to all features!',
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Purchase Failed', purchaseResult.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      Alert.alert('Purchase Failed', 'Please try again later');
    } finally {
      setPurchasing(false);
    }
  };

  const PlanCard = ({ plan, isPopular = false }: { plan: SubscriptionPlan; isPopular?: boolean }) => {
    const price = plan.price_monthly || plan.price_yearly;
    const period = plan.price_monthly ? 'month' : 'year';
    const savings = plan.name === 'Premium Yearly' ? '2 months free!' : null;

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isPopular && styles.popularPlan,
          selectedPlan?.id === plan.id && styles.selectedPlan,
        ]}
        onPress={() => setSelectedPlan(plan)}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}
        
        <Text style={styles.planName}>{plan.name.replace('Premium ', '')}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${price}</Text>
          <Text style={styles.period}>/{period}</Text>
        </View>
        
        {savings && (
          <Text style={styles.savings}>{savings}</Text>
        )}
        
        <View style={styles.featuresContainer}>
          {plan.features.slice(0, 4).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#DC851F" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {subscriptionStatus?.isTrialActive ? 'Trial Ending Soon!' : 'Upgrade to Premium'}
          </Text>
          <Text style={styles.subtitle}>
            {subscriptionStatus?.isTrialActive 
              ? `${subscriptionStatus.daysRemaining} day${subscriptionStatus.daysRemaining !== 1 ? 's' : ''} remaining in your free trial`
              : 'Continue enjoying your premium cigar catalog'
            }
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Premium Features</Text>
          
          <View style={styles.benefitsList}>
            {[
              { icon: 'camera', title: 'Unlimited AI Recognition', desc: 'Identify any cigar instantly' },
              { icon: 'archive', title: 'Unlimited Inventory', desc: 'Track your entire collection' },
              { icon: 'book', title: 'Detailed Journal', desc: 'Record every smoking experience' },
              { icon: 'star', title: 'Smart Recommendations', desc: 'Discover cigars you\'ll love' },
              { icon: 'cloud', title: 'Cloud Sync', desc: 'Access anywhere, anytime' },
              { icon: 'analytics', title: 'Advanced Analytics', desc: 'Insights into your preferences' },
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
              {monthlyPlan && (
                <PlanCard plan={monthlyPlan} />
              )}
              {yearlyPlan && (
                <PlanCard plan={yearlyPlan} isPopular={true} />
              )}
            </View>
          )}
        </View>

        {/* Purchase Button */}
        {selectedPlan && (
          <TouchableOpacity
            style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
            onPress={() => handlePurchase(selectedPlan)}
            disabled={purchasing}
          >
            <Text style={styles.purchaseButtonText}>
              {purchasing ? 'Processing...' : `Start Premium - $${selectedPlan.price_monthly || selectedPlan.price_yearly}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancel anytime • Secure payment • Instant access
          </Text>
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




