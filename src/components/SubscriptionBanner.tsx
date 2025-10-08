import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubscriptionBanner() {
  const navigation = useNavigation();
  const { subscriptionStatus } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    const checkDismissalStatus = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('subscription_banner_dismissed');
        if (dismissed === 'true') {
          setIsDismissed(true);
        }
      } catch (error) {
        console.error('Error checking banner dismissal status:', error);
      }
    };

    checkDismissalStatus();
  }, []);

  // Reset dismissal status when subscription status changes
  useEffect(() => {
    if (subscriptionStatus) {
      // Reset dismissal if trial status changes (e.g., trial expires)
      const resetDismissal = async () => {
        try {
          await AsyncStorage.removeItem('subscription_banner_dismissed');
          setIsDismissed(false);
        } catch (error) {
          console.error('Error resetting banner dismissal:', error);
        }
      };

      // Only reset if we have a meaningful status change
      if (subscriptionStatus.status === 'trial' || !subscriptionStatus.hasAccess) {
        resetDismissal();
      }
    }
  }, [subscriptionStatus?.status, subscriptionStatus?.hasAccess]);

  // Debug logging
  console.log('🔍 SubscriptionBanner - subscriptionStatus:', subscriptionStatus);

  if (!subscriptionStatus || isDismissed) {
    console.log('🔍 SubscriptionBanner - No subscription status or dismissed, returning null');
    return null;
  }

  // Don't show banner if user has active premium subscription
  if (subscriptionStatus.isPremium) return null;

  // Show trial banner
  if (subscriptionStatus.isTrialActive) {
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
                    <Ionicons 
                      name={isUrgent ? "warning" : "time"} 
                      size={18} 
                      color="#FFD700" 
                    />
                  </View>
                  <Text style={[styles.bannerText, isUrgent && styles.urgentText]}>
                    {subscriptionStatus.daysRemaining === 0 
                      ? "Trial expires today!" 
                      : `${subscriptionStatus.daysRemaining} day${subscriptionStatus.daysRemaining !== 1 ? 's' : ''} left`
                    }
                  </Text>
                </View>
                
                <LinearGradient
                  colors={['#FF8C42', '#FFD700']}
                  style={styles.upgradeButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.upgradeText}>Upgrade</Text>
                </LinearGradient>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={async (e) => {
                    e.stopPropagation();
                    try {
                      // Store dismissal state in AsyncStorage
                      await AsyncStorage.setItem('subscription_banner_dismissed', 'true');
                      setIsDismissed(true);
                      console.log('🔍 SubscriptionBanner - Banner dismissed by user');
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

  // Show expired banner
  if (!subscriptionStatus.hasAccess) {
    return (
      <TouchableOpacity 
        style={[styles.banner, styles.expiredBanner]}
        onPress={() => navigation.navigate('Paywall' as never)}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="lock-closed" size={16} color="#FF6B35" />
          <Text style={styles.expiredText}>Trial expired - Upgrade to continue</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
        </View>
      </TouchableOpacity>
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



