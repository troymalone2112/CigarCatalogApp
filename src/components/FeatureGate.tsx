import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Component that gates features based on subscription status
 * Shows upgrade prompt when user doesn't have access
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const { hasAccess, isTrialActive, daysRemaining } = useFeatureAccess();
  const navigation = useNavigation();

  // If user has access, show the feature
  if (hasAccess(feature)) {
    return <>{children}</>;
  }

  // If custom fallback provided, show it
  if (fallback) {
    return <>{fallback}</>;
  }

  // If no upgrade prompt wanted, show nothing
  if (!showUpgradePrompt) {
    return null;
  }

  // Show upgrade prompt
  return (
    <View style={styles.upgradePrompt}>
      <View style={styles.upgradeContent}>
        <Ionicons name="lock-closed" size={24} color="#DC851F" />
        <Text style={styles.upgradeTitle}>
          {isTrialActive ? 'Trial Expired' : 'Premium Feature'}
        </Text>
        <Text style={styles.upgradeText}>
          {isTrialActive
            ? `Your ${daysRemaining}-day trial has ended. Upgrade to continue using all features.`
            : 'This feature requires a premium subscription.'}
        </Text>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Paywall' as never)}
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Simple hook for feature gating in components
 */
export const useFeatureGate = (feature: string) => {
  const { hasAccess } = useFeatureAccess();
  return hasAccess(feature);
};

const styles = StyleSheet.create({
  upgradePrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
  },
  upgradeContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
