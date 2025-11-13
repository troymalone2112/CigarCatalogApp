import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { RecognitionFlowProvider } from './src/contexts/RecognitionFlowContext';
import { JournalDraftProvider } from './src/contexts/JournalDraftContext';
import AppNavigator from './src/navigation/AppNavigator';
import { OptimizedHumidorService } from './src/services/optimizedHumidorService';
import { StorageService } from './src/storage/storageService';
import { DashboardCacheService } from './src/services/dashboardCacheService';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initializePWA } from './src/utils/pwaUtils';
import AddToHomeScreenBanner from './src/components/AddToHomeScreenBanner';

// Preloader component that runs inside AuthProvider
function AppPreloader() {
  const { user } = useAuth();
  React.useEffect(() => {
    const preload = async () => {
      try {
        if (!user) return;
        // Warm humidor cache in background
        OptimizedHumidorService.preloadHumidorData(user.id).catch(() => {});
        // Warm journal cache in background
        StorageService.getJournalEntries(false).catch(() => {});
        // Seed dashboard cache if empty
        const cached = await DashboardCacheService.getCachedDashboardData(user.id);
        if (!cached) {
          StorageService.getInventory()
            .then(async (inv) => {
              const journal = await StorageService.getJournalEntries(false);
              await DashboardCacheService.cacheDashboardData(
                user.id,
                inv.reduce((s: number, it: any) => s + (it.quantity || 0), 0),
                journal.length,
                journal.slice(0, 3),
              );
            })
            .catch(() => {});
        }
      } catch {}
    };
    preload();
  }, [user]);
  return null;
}

export default function App() {
  // Initialize PWA features on web
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      initializePWA();
    }
  }, []);

  // RevenueCat initialization removed from startup - now handled on-demand by PaymentService
  // This eliminates the 10-second timeout and network dependency on app startup
  console.log('🚀 Starting Cigar Catalog App with database-first architecture...');

  // Log environment variables for debugging
  console.log('🔍 Environment check:');

  console.log('  Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log(
    '  Supabase Key:',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  );
  console.log('  OpenAI Key:', process.env.EXPO_PUBLIC_OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log(
    '  Perplexity Key:',
    process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY ? '✅ Set' : '❌ Missing',
  );
  console.log(
    '  RevenueCat iOS Key:',
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ? '✅ Set' : '❌ Missing',
  );

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <RecognitionFlowProvider>
            <JournalDraftProvider>
              {Platform.OS === 'web' && <AddToHomeScreenBanner />}
              <AppPreloader />
              <AppNavigator />
              <StatusBar style="light" />
            </JournalDraftProvider>
          </RecognitionFlowProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
// Cache bust: Tue Oct 28 18:25:38 MDT 2025
