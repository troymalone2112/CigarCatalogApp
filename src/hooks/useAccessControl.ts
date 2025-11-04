import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

export const useAccessControl = () => {
  const { subscriptionStatus } = useSubscription();
  const navigation = useNavigation();

  const checkAccess = (feature: 'scan' | 'humidor' | 'journal' | 'recognition'): boolean => {
    if (!subscriptionStatus) {
      // If subscription status is not loaded yet, allow access (loading state)
      return true;
    }

    // If user has access (premium or active trial), allow all features
    if (subscriptionStatus.hasAccess) {
      return true;
    }

    // If user doesn't have access, show upgrade prompt
    showUpgradePrompt(feature);
    return false;
  };

  const showUpgradePrompt = (feature: string) => {
    const featureNames = {
      scan: 'cigar scanning',
      humidor: 'adding cigars to humidor',
      journal: 'creating journal entries',
      recognition: 'cigar recognition',
    };

    const featureName = featureNames[feature as keyof typeof featureNames] || feature;

    Alert.alert(
      'Premium Feature',
      `Your free trial has expired. Upgrade to Premium to continue using ${featureName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: () => navigation.navigate('Paywall' as never),
        },
      ],
    );
  };

  const canScan = () => checkAccess('scan');
  const canAddToHumidor = () => checkAccess('humidor');
  const canAddToJournal = () => checkAccess('journal');
  const canUseRecognition = () => checkAccess('recognition');

  return {
    hasAccess: subscriptionStatus?.hasAccess ?? true, // Default to true during loading
    canScan,
    canAddToHumidor,
    canAddToJournal,
    canUseRecognition,
    checkAccess,
    showUpgradePrompt,
  };
};
