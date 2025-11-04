import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Hook to check if user has access to specific features
 * This is the main way to gate features throughout the app
 */
export const useFeatureAccess = () => {
  const { subscriptionStatus } = useSubscription();

  const hasAccess = (feature: string): boolean => {
    if (!subscriptionStatus) return false;

    // During trial or premium, all features are available
    if (subscriptionStatus.hasAccess) return true;

    // Define features that are always free (read-only access)
    const freeFeatures = [
      'journal_viewing',
      'humidor_viewing',
      'inventory_viewing',
      'basic_navigation',
    ];

    return freeFeatures.includes(feature);
  };

  const canCreateJournal = (): boolean => hasAccess('journal_creation');
  const canEditJournal = (): boolean => hasAccess('journal_editing');
  const canUseScanner = (): boolean => hasAccess('cigar_recognition');
  const canCreateHumidor = (): boolean => hasAccess('humidor_creation');
  const canEditHumidor = (): boolean => hasAccess('humidor_editing');
  const canAddInventory = (): boolean => hasAccess('inventory_management');
  const canViewRecommendations = (): boolean => hasAccess('recommendations');

  return {
    hasAccess,
    canCreateJournal,
    canEditJournal,
    canUseScanner,
    canCreateHumidor,
    canEditHumidor,
    canAddInventory,
    canViewRecommendations,
    isTrialActive: subscriptionStatus?.isTrialActive || false,
    isPremium: subscriptionStatus?.isPremium || false,
    daysRemaining: subscriptionStatus?.daysRemaining || 0,
  };
};
