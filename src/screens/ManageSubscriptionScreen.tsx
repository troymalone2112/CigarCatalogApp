import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { RevenueCatService } from '../services/revenueCatService';

export default function ManageSubscriptionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { subscriptionStatus, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    loadSubscriptionDetails();
  }, []);

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const customerInfo = await RevenueCatService.getCustomerInfo();
      setSubscriptionDetails(customerInfo);
    } catch (error) {
      console.error('Failed to load subscription details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscriptionStatus || !subscriptionDetails) {
      return null;
    }

    const isActive = subscriptionStatus.isPremium;
    const isCancelled = subscriptionDetails.entitlements?.active?.premium?.willRenew === false;
    const isExpired = !isActive && subscriptionStatus.hasEverSubscribed;
    const hasBillingIssue = subscriptionDetails.entitlements?.active?.premium?.isActive === false && 
                           subscriptionStatus.hasEverSubscribed;

    // Calculate grace period (16 days from expiration)
    const gracePeriodDays = 16;
    const expirationDate = subscriptionDetails.entitlements?.active?.premium?.expirationDate;
    const gracePeriodEnd = expirationDate ? new Date(new Date(expirationDate).getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000)) : null;
    const daysLeftInGrace = gracePeriodEnd ? Math.ceil((gracePeriodEnd.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 0;

    const planType = subscriptionStatus.planType || 'Monthly';
    const isYearly = planType.toLowerCase().includes('yearly') || planType.toLowerCase().includes('annual');

    return {
      isActive,
      isCancelled,
      isExpired,
      hasBillingIssue,
      planType: isYearly ? 'Yearly' : 'Monthly',
      expirationDate,
      gracePeriodEnd,
      daysLeftInGrace: Math.max(0, daysLeftInGrace),
    };
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel your subscription, you\'ll need to go to your Apple ID settings. Your subscription will remain active until the end of your current billing period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openURL('App-prefs:APPLE_ID&path=SUBSCRIPTIONS');
          },
        },
      ]
    );
  };

  const handleRenewSubscription = () => {
    navigation.navigate('Paywall' as never);
  };

  const handleUpdatePayment = () => {
    Alert.alert(
      'Update Payment Method',
      'To update your payment method, you\'ll need to go to your Apple ID settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openURL('App-prefs:APPLE_ID&path=SUBSCRIPTIONS');
          },
        },
      ]
    );
  };

  const status = getSubscriptionStatus();

  if (!status) {
    return (
      <ImageBackground 
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.backgroundImage}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Subscription Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>
                Premium Member on the {status.planType} Subscription
                {status.isCancelled && ' (Cancelled)'}
                {status.isExpired && ' (Payment Issue)'}
                {status.hasBillingIssue && ' (Billing Issue)'}
              </Text>
              
              {status.isCancelled && status.expirationDate && (
                <Text style={styles.warningText}>
                  Your subscription is cancelled and you will lose access on {formatDate(status.expirationDate)}
                </Text>
              )}
              
              {(status.isExpired || status.hasBillingIssue) && status.daysLeftInGrace > 0 && (
                <Text style={styles.warningText}>
                  You have {status.daysLeftInGrace} day{status.daysLeftInGrace !== 1 ? 's' : ''} left to resubscribe or update your payment information.
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {status.isActive && !status.isCancelled && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}

          {(status.isCancelled || status.isExpired || status.hasBillingIssue) && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleRenewSubscription}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Renew Subscription</Text>
            </TouchableOpacity>
          )}

          {(status.isExpired || status.hasBillingIssue) && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleUpdatePayment}
            >
              <Ionicons name="card" size={20} color="#DC851F" />
              <Text style={[styles.actionButtonText, styles.secondaryText]}>Update Payment Method</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {status.isActive && !status.isCancelled 
              ? 'Your subscription is active and will automatically renew.'
              : 'Manage your subscription through your Apple ID settings or renew to continue enjoying premium features.'
            }
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
  },
  statusHeader: {
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
    lineHeight: 20,
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
});

