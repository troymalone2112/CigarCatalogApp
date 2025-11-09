import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubscriptionBanner() {
  const navigation = useNavigation();
  const { subscriptionStatus } = useSubscription();
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastDismissedDaysRemaining, setLastDismissedDaysRemaining] = useState<number | null>(null);
  const storageKey = `subscription_banner_dismissed_${user?.id || 'anon'}`;

  // Component rendering (debug removed to reduce console spam)

  // Check if banner was previously dismissed
  useEffect(() => {
    const checkDismissalStatus = async () => {
      try {
        const dismissedData = await AsyncStorage.getItem(storageKey);
        if (dismissedData) {
          const parsedData = JSON.parse(dismissedData);
          setIsDismissed(parsedData.dismissed || false);
          setLastDismissedDaysRemaining(parsedData.daysRemaining || null);
        }
      } catch (error) {
        console.error('Error checking banner dismissal status:', error);
        setIsDismissed(false);
      }
    };

    checkDismissalStatus();
  }, [storageKey]);

  // Reset dismissal status when days remaining decreases (new day started)
  useEffect(() => {
    if (subscriptionStatus && subscriptionStatus.isTrialActive) {
      const currentDays = subscriptionStatus.daysRemaining;

      // If user dismissed when it was 3 days, show again when it's 2 days
      // If user dismissed when it was 2 days, show again when it's 1 day
      // Always show when 0 days (expires today)
      if (lastDismissedDaysRemaining !== null && currentDays < lastDismissedDaysRemaining) {
        const resetDismissal = async () => {
          try {
            await AsyncStorage.removeItem(storageKey);
            setIsDismissed(false);
            setLastDismissedDaysRemaining(null);
            console.log(
              '🔍 Banner re-shown: days decreased from',
              lastDismissedDaysRemaining,
              'to',
              currentDays,
            );
          } catch (error) {
            console.error('Error resetting banner dismissal:', error);
          }
        };
        resetDismissal();
      }

      // Always show on last day (0 days remaining)
      if (currentDays === 0 && isDismissed) {
        const forceShow = async () => {
          try {
            await AsyncStorage.removeItem(storageKey);
            setIsDismissed(false);
            setLastDismissedDaysRemaining(null);
            console.log('🔍 Banner force shown: trial expires today');
          } catch (error) {
            console.error('Error force showing banner:', error);
          }
        };
        forceShow();
      }
    }

    // If trial expired and no access, always show
    if (subscriptionStatus && !subscriptionStatus.hasAccess) {
      if (isDismissed) {
        const forceShow = async () => {
          try {
            await AsyncStorage.removeItem(storageKey);
            setIsDismissed(false);
            setLastDismissedDaysRemaining(null);
            console.log('🔍 Banner force shown: trial expired');
          } catch (error) {
            console.error('Error force showing expired banner:', error);
          }
        };
        forceShow();
      }
    }
  }, [
    subscriptionStatus,
    subscriptionStatus?.daysRemaining,
    subscriptionStatus?.hasAccess,
    subscriptionStatus?.isTrialActive,
    storageKey,
    isDismissed,
    lastDismissedDaysRemaining,
  ]);

  // Debug logging removed to reduce console spam

  // No status yet → don't render to avoid confusion
  if (!subscriptionStatus) {
    return null;
  }

  // Don't show banner if user has active premium subscription
  if (subscriptionStatus.isPremium) {
    console.log('🔍 SubscriptionBanner - User is premium, returning null');
    return null;
  }

  // Respect dismissal state unless forced to show by the effect logic above
  if (isDismissed) {
    return null;
  }

  console.log('🔍 SubscriptionBanner - isTrialActive:', subscriptionStatus.isTrialActive);
  console.log('🔍 SubscriptionBanner - hasAccess:', subscriptionStatus.hasAccess);
  console.log('🔍 SubscriptionBanner - isPremium:', subscriptionStatus.isPremium);

  // Show banner if trial is active OR if user has access but is not premium
  if (
    subscriptionStatus.isTrialActive ||
    (subscriptionStatus.hasAccess && !subscriptionStatus.isPremium)
  ) {
    console.log('🔍 SubscriptionBanner - showing trial banner');
    const isUrgent = subscriptionStatus.daysRemaining <= 1;

    return (
      <TouchableOpacity
        style={styles.bannerContainer}
        onPress={() => navigation.navigate('Paywall' as never)}
        activeOpacity={0.8}
      >
        <ImageBackground
          source={require('../../assets/tobacco-leaves-bg.jpg')}
          style={styles.bannerBackground}
          imageStyle={styles.tobaccoBackgroundImage}
        >
          <View style={styles.bannerOutline}>
            <View style={styles.banner}>
              <View style={styles.bannerContent}>
                <View style={styles.leftSection}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={isUrgent ? 'warning' : 'time'} size={18} color="#FFD700" />
                  </View>
                  <Text style={[styles.bannerText, isUrgent && styles.urgentText]}>
                    {subscriptionStatus.daysRemaining === 0
                      ? 'Trial expires today!'
                      : `${subscriptionStatus.daysRemaining} day${subscriptionStatus.daysRemaining !== 1 ? 's' : ''} left`}
                  </Text>
                </View>

                <View style={styles.upgradeButton}>
                  <Text style={styles.upgradeText}>Upgrade</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={async (e) => {
                    e.stopPropagation();
                    try {
                      // Store dismissal state with current days remaining in AsyncStorage
                      const dismissalData = JSON.stringify({
                        dismissed: true,
                        daysRemaining: subscriptionStatus.daysRemaining,
                        dismissedAt: new Date().toISOString(),
                      });
                      await AsyncStorage.setItem(storageKey, dismissalData);
                      setIsDismissed(true);
                      setLastDismissedDaysRemaining(subscriptionStatus.daysRemaining);
                      console.log(
                        '🔍 SubscriptionBanner - Banner dismissed by user at',
                        subscriptionStatus.daysRemaining,
                        'days remaining',
                      );
                    } catch (error) {
                      console.error('Error dismissing banner:', error);
                    }
                  }}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  // Show expired banner with same styling as normal banner
  if (!subscriptionStatus.hasAccess) {
    return (
      <View style={styles.bannerContainer}>
        <ImageBackground
          source={require('../../assets/tobacco-leaves-bg.jpg')}
          style={styles.bannerBackground}
          imageStyle={styles.tobaccoBackgroundImage}
        >
          <View style={styles.bannerOutline}>
            <TouchableOpacity
              style={styles.banner}
              onPress={() => navigation.navigate('Paywall' as never)}
            >
              <View style={styles.bannerContent}>
                <View style={styles.leftSection}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="time" size={16} color="#FFD700" />
                  </View>
                  <Text style={styles.bannerText}>0 days left</Text>
                </View>
                <View style={styles.upgradeButton}>
                  <Text style={styles.upgradeText}>Upgrade</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  bannerBackground: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tobaccoBackgroundImage: {
    opacity: 0.4, // Same opacity as Journal and Inventory screens
    resizeMode: 'cover',
  },
  bannerOutline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC851F', // Match button color below banner
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: 'rgba(10, 10, 10, 0.8)', // Dark overlay like main screens
  },
  banner: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent', // Let background show through
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    borderWidth: 1,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  urgentText: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#DC851F', // Solid signature orange/yellow
  },
  upgradeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Legacy styles for expired banner
  expiredBanner: {
    backgroundColor: 'rgba(255, 107, 53, 0.85)',
    borderColor: 'rgba(255, 107, 53, 0.95)',
  },
  expiredText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B35',
    marginLeft: 8,
    fontWeight: '600',
  },
});
