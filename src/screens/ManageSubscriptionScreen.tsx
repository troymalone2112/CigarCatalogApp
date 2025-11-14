import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';

const SUPPORT_EMAIL = 'support@cigarapp.co';

export default function ManageSubscriptionScreen() {
  const navigation = useNavigation();
  const { subscriptionStatus, refreshSubscription, cancelSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);

  const derivedStatus = useMemo(() => {
    if (!subscriptionStatus) return null;

    const planLabel =
      subscriptionStatus.plan?.name ||
      (subscriptionStatus.isPremium ? 'Premium Access' : subscriptionStatus.isTrialActive ? 'Free Trial' : 'Free Tier');

    return {
      label: planLabel,
      status: subscriptionStatus.status || (subscriptionStatus.isPremium ? 'active' : 'free'),
      hasAccess: subscriptionStatus.hasAccess,
      isPremium: subscriptionStatus.isPremium,
      isTrial: subscriptionStatus.isTrialActive,
      daysRemaining: subscriptionStatus.daysRemaining ?? 0,
    };
  }, [subscriptionStatus]);

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Subscription%20Question`).catch(() => {});
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshSubscription();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Premium Access',
      'We can immediately mark your subscription as cancelled in our system. You will retain access until the current term ends. Continue?',
      [
        { text: 'Keep Access', style: 'cancel' },
        {
          text: 'Cancel Access',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cancelSubscription();
              if (result.success) {
                Alert.alert('Subscription Updated', 'Your subscription has been marked as cancelled.');
                await refreshSubscription();
              } else {
                Alert.alert('Unable to Cancel', result.error || 'Please try again later.');
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (!derivedStatus) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.backgroundImage}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
            </TouchableOpacity>
            <Text style={styles.title}>Manage Subscription</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading subscription details...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>{derivedStatus.label}</Text>
            <Text style={styles.statusSubtitle}>Status: {derivedStatus.status}</Text>
            {derivedStatus.daysRemaining > 0 && (
              <Text style={styles.statusSubtitle}>
                Days Remaining: {derivedStatus.daysRemaining.toString()}
              </Text>
            )}
            <Text style={styles.infoText}>
              {derivedStatus.isPremium
                ? 'Premium access is active on this account. Contact us if you need to change billing or transfer a plan.'
                : derivedStatus.isTrial
                  ? 'Trial access is active. Reach out before it expires if you would like to upgrade.'
                  : 'Upgrading is handled directly. Contact us whenever you are ready to unlock premium features.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {derivedStatus.isPremium && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Ionicons name='close-circle' size={20} color='#FF4444' />
              <Text style={[styles.actionButtonText, styles.cancelText]}>
                {loading ? 'Updating...' : 'Cancel Premium Access'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={handleRefresh} disabled={loading}>
            <Ionicons name='refresh' size={20} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('Paywall' as never)}
          >
            <Ionicons name='pricetag' size={20} color='#DC851F' />
            <Text style={[styles.actionButtonText, styles.secondaryText]}>View Upgrade Options</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleContactSupport}
          >
            <Ionicons name='mail-outline' size={20} color='#DC851F' />
            <Text style={[styles.actionButtonText, styles.secondaryText]}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Need to change billing or have questions? Email us at{' '}
            <Text style={styles.highlight}>{SUPPORT_EMAIL}</Text> and we will take care of it
            quickly.
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
    opacity: 0.3,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  statusContainer: {
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  cancelButton: {
    borderColor: '#FF4444',
  },
  cancelText: {
    color: '#FF4444',
  },
  secondaryButton: {
    borderColor: '#DC851F',
  },
  secondaryText: {
    color: '#DC851F',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  highlight: {
    color: '#DC851F',
    fontWeight: '600',
  },
});

