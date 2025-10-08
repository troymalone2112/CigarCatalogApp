import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionPlan } from '../services/subscriptionService';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { subscriptionStatus, subscriptionPlans, createPremiumSubscription, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const monthlyPlan = subscriptionPlans.find(plan => plan.name === 'Premium Monthly');
  const yearlyPlan = subscriptionPlans.find(plan => plan.name === 'Premium Yearly');

  const handlePurchase = async (plan: SubscriptionPlan) => {
    try {
      setPurchasing(true);
      
      // In a real app, you'd integrate with Stripe or another payment processor
      // For now, we'll simulate a successful purchase
      const result = await createPremiumSubscription(plan.id, 'mock_payment_method');
      
      if (result.success) {
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription has been activated. Enjoy unlimited access to all features!',
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong');
      }
    } catch (error) {
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
              <Ionicons name="checkmark-circle" size={16} color="#7C2D12" />
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
                  <Ionicons name={benefit.icon as any} size={24} color="#7C2D12" />
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
          
          <View style={styles.plansContainer}>
            {monthlyPlan && (
              <PlanCard plan={monthlyPlan} />
            )}
            {yearlyPlan && (
              <PlanCard plan={yearlyPlan} isPopular={true} />
            )}
          </View>
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
    opacity: 0.1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitsList: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 45, 18, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginBottom: 30,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#333333',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#7C2D12',
    backgroundColor: 'rgba(124, 45, 18, 0.1)',
  },
  selectedPlan: {
    borderColor: '#7C2D12',
    backgroundColor: 'rgba(124, 45, 18, 0.15)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#7C2D12',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 14,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C2D12',
  },
  period: {
    fontSize: 16,
    color: '#CCCCCC',
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    color: '#7C2D12',
    fontWeight: '600',
    marginBottom: 16,
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
    backgroundColor: '#7C2D12',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7C2D12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#4A1A0A',
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});




