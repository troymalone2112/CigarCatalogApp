import React, { useState } from 'react';
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

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = () => {
    // Navigate to subscription management screen
    navigation.navigate('ManageSubscription' as never);
  };

  const handleUpgrade = () => {
    // Navigate to paywall screen to purchase subscription
    navigation.navigate('Paywall' as never);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://your-privacy-policy-url.com');
  };

  const handleUserLicense = () => {
    Linking.openURL('https://your-eula-url.com');
  };

  const handleOpenSourceLicenses = () => {
    navigation.navigate('OpenSourceLicenses' as never);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete your account and all associated data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getMemberStatus = () => {
    // Debug logging to understand subscription status
    console.log('🔍 ProfileScreen - Subscription status:', subscriptionStatus);
    console.log('🔍 ProfileScreen - isPremium:', subscriptionStatus?.isPremium);
    console.log('🔍 ProfileScreen - isTrialActive:', subscriptionStatus?.isTrialActive);
    console.log('🔍 ProfileScreen - hasAccess:', subscriptionStatus?.hasAccess);
    console.log('🔍 ProfileScreen - daysRemaining:', subscriptionStatus?.daysRemaining);
    
    if (subscriptionStatus?.isPremium) {
      return {
        status: 'Premium Member',
        subtitle: 'Full access to all features',
        color: '#DC851F',
      };
    } else if (subscriptionStatus?.isTrialActive) {
      return {
        status: 'Free Trial Member',
        subtitle: `${subscriptionStatus.daysRemaining} day${subscriptionStatus.daysRemaining !== 1 ? 's' : ''} remaining`,
        color: '#DC851F',
      };
    } else {
      return {
        status: 'Free Member',
        subtitle: 'Limited access to features',
        color: '#CCCCCC',
      };
    }
  };

  const memberInfo = getMemberStatus();

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
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Member Status */}
        <View style={styles.memberStatusContainer}>
          <View style={styles.memberStatus}>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberStatusText, { color: memberInfo.color }]}>
                {memberInfo.status}
              </Text>
              <Text style={styles.memberSubtitle}>
                {memberInfo.subtitle}
              </Text>
            </View>
            {subscriptionStatus?.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color="#FFFFFF" />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
          </View>
          
          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>
              Logged in as: {user?.email}
            </Text>
          </View>

          {/* Upgrade Button - Show for trial or expired users, not for premium */}
          {(() => {
            console.log('🔍 ProfileScreen - Upgrade button logic:');
            console.log('🔍 ProfileScreen - subscriptionStatus:', subscriptionStatus);
            console.log('🔍 ProfileScreen - !subscriptionStatus?.isPremium:', !subscriptionStatus?.isPremium);
            console.log('🔍 ProfileScreen - subscriptionStatus?.isTrialActive:', subscriptionStatus?.isTrialActive);
            console.log('🔍 ProfileScreen - Should show upgrade button:', !subscriptionStatus?.isPremium);
            
            // Show upgrade button for all non-premium users
            // This ensures the button always appears for trial users and expired users
            // If subscriptionStatus is null/undefined, assume user is on trial (new user)
            const shouldShowUpgrade = !subscriptionStatus?.isPremium;
            
            console.log('🔍 ProfileScreen - Final decision - shouldShowUpgrade:', shouldShowUpgrade);
            
            // Additional fallback: if subscriptionStatus is null/undefined, show upgrade button
            // This handles cases where subscription data hasn't loaded yet
            if (subscriptionStatus === null || subscriptionStatus === undefined) {
              console.log('🔍 ProfileScreen - Subscription status is null/undefined, showing upgrade button as fallback');
              return (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                >
                  <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>
                    Subscribe to Premium
                  </Text>
                </TouchableOpacity>
              );
            }
            
            if (shouldShowUpgrade) {
              return (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                >
                  <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>
                    {subscriptionStatus?.isTrialActive 
                      ? 'Upgrade to Premium' 
                      : 'Subscribe to Premium'}
                  </Text>
                </TouchableOpacity>
              );
            }
            
            return null;
          })()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Only show Manage Subscription for premium users */}
          {subscriptionStatus?.isPremium && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleManageSubscription}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handlePrivacyPolicy}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleUserLicense}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>User License Agreement</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleOpenSourceLicenses}
          >
            <Ionicons name="code-slash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Open Source Licenses</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash" size={20} color="#FF4444" />
            <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
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
  memberStatusContainer: {
    marginBottom: 24,
  },
  memberStatus: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
  },
  memberStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  premiumBadge: {
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  actionsContainer: {
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  dangerButton: {
    borderColor: '#FF4444',
  },
  dangerText: {
    color: '#FF4444',
  },
  userInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  userInfoText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#DC851F',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC851F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
