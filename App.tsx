import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { RecognitionFlowProvider } from './src/contexts/RecognitionFlowContext';
import { JournalDraftProvider } from './src/contexts/JournalDraftContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  // RevenueCat initialization removed from startup - now handled on-demand by PaymentService
  // This eliminates the 10-second timeout and network dependency on app startup
  console.log('🚀 Starting Cigar Catalog App with database-first architecture...');

  // Log environment variables for debugging
  console.log('🔍 Environment check:');
  console.log('  Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  Supabase Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('  OpenAI Key:', process.env.EXPO_PUBLIC_OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('  Perplexity Key:', process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('  RevenueCat iOS Key:', process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ? '✅ Set' : '❌ Missing');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <RecognitionFlowProvider>
            <JournalDraftProvider>
              <AppNavigator />
              <StatusBar style="light" />
            </JournalDraftProvider>
          </RecognitionFlowProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
