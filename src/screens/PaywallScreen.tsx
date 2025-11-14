import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';

const SUPPORT_EMAIL = 'support@cigarapp.co';

const fallbackPlans = [
  {
    id: 'trial',
    name: 'Free Trial',
    description: 'Limited-time access for new members',
    priceLabel: 'Included',
    features: [
      'Full humidor management',
      'Cigar recognition (limited)',
      'Journal & tasting notes',
      'Dashboard insights',
    ],
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    description: 'Unlimited access with monthly billing',
    priceLabel: '$9.99 / month',
    features: [
      'Unlimited recognition & AI insights',
      'Unlimited humidors & inventory tracking',
      'Advanced note templates & filters',
      'Priority roadmap access',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    description: 'Annual plan with savings and concierge onboarding',
    priceLabel: '$99 / year',
    features: ['Everything in Premium Monthly', 'Priority support', 'Early feature previews'],
  },
];

const featureList = [
  {
    title: 'Cigar Recognition',
    description: 'AI-powered detection from photos or uploads',
    icon: 'scan-outline' as const,
  },
  {
    title: 'Humidor Intelligence',
    description: 'Capacity alerts, value tracking, and inventory health',
    icon: 'albums-outline' as const,
  },
  {
    title: 'Notes & Journal',
    description: 'Structured tasting notes with pairings, mood, and location',
    icon: 'book-outline' as const,
  },
  {
    title: 'Cloud Sync',
    description: 'Secure backups and seamless device switching',
    icon: 'cloud-upload-outline' as const,
  },
];

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { subscriptionStatus, subscriptionPlans } = useSubscription();

  const plans =
    subscriptionPlans.length > 0
      ? subscriptionPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description || 'Premium access plan',
          priceLabel:
            plan.price_monthly !== null && plan.price_monthly !== undefined
              ? `$${plan.price_monthly.toFixed(2)} / month`
              : plan.price_yearly !== null && plan.price_yearly !== undefined
                ? `$${plan.price_yearly.toFixed(2)} / year`
                : 'Contact for pricing',
          features: plan.features?.length ? plan.features : fallbackPlans[0].features,
        }))
      : fallbackPlans;

  const statusLabel = subscriptionStatus?.isPremium
    ? 'Premium access is active on this account.'
    : subscriptionStatus?.isTrialActive
      ? 'Trial access is active.'
      : 'You are using the free experience.';

  const statusDescription = subscriptionStatus?.isPremium
    ? 'If you need to migrate, pause, or adjust billing, contact us and we will handle it directly.'
    : 'App Store / RevenueCat billing has been removed for the PWA version. Reach out and we will upgrade or migrate your account manually.';

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Cigar Catalog Premium Access');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      // Fallback is simply to show the email in the status card
    });
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundOverlay}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Access</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{statusLabel}</Text>
          <Text style={styles.statusDescription}>{statusDescription}</Text>
          <View style={styles.contactRow}>
            <Ionicons name='mail-outline' size={18} color='#DC851F' />
            <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.priceLabel}</Text>
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>
              <View style={styles.planFeatures}>
                {plan.features.slice(0, 4).map((feature) => (
                  <View key={feature} style={styles.planFeatureRow}>
                    <Ionicons name='checkmark-circle' size={16} color='#DC851F' />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You Unlock</Text>
          {featureList.map((feature) => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={24} color='#DC851F' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContactSupport}>
            <Text style={styles.primaryButtonText}>Contact Support To Upgrade</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>
            We manage subscriptions directly for the web app so we can keep fees low and offer
            flexible plans. Send us a quick email and we will take care of the upgrade or transfer.
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundOverlay: {
    opacity: 0.25,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 24,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  contactText: {
    color: '#DC851F',
    fontSize: 14,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  planPrice: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '600',
  },
  planDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 12,
  },
  planFeatures: {
    gap: 6,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 12,
  },
  featureIcon: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 12,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#DC851F',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    color: '#AAAAAA',
    fontSize: 12,
    lineHeight: 18,
  },
});

