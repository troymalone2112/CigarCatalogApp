import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { RecognitionFlowProvider } from './src/contexts/RecognitionFlowContext';
import { JournalDraftProvider } from './src/contexts/JournalDraftContext';
import AppNavigator from './src/navigation/AppNavigator';
import { RevenueCatService } from './src/services/revenueCatService';

export default function App() {
  useEffect(() => {
    // Initialize RevenueCat when app starts (non-blocking)
    const initializeRevenueCat = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RevenueCat initialization timeout')), 10000)
        );
        
        await Promise.race([
          RevenueCatService.initialize(),
          timeoutPromise
        ]);
        
        console.log('✅ RevenueCat initialized in App.tsx');
      } catch (error) {
        console.error('❌ Failed to initialize RevenueCat in App.tsx:', error);
        // Don't block app startup if RevenueCat fails
        console.log('⚠️ Continuing without RevenueCat...');
      }
    };

    // Run in background, don't block app startup
    initializeRevenueCat();
  }, []);

  return (
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
  );
}
