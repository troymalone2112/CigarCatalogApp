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
        console.log('🚀 Starting RevenueCat initialization in App.tsx...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RevenueCat initialization timeout')), 10000)
        );
        
        await Promise.race([
          RevenueCatService.initialize(),
          timeoutPromise
        ]);
        
        console.log('✅ RevenueCat initialized successfully in App.tsx');
        
        // Test getting offerings to verify everything is working
        try {
          const offerings = await RevenueCatService.getOfferings();
          console.log('📦 RevenueCat offerings loaded:', offerings ? 'SUCCESS' : 'FAILED');
        } catch (offeringsError) {
          console.error('❌ Failed to load offerings:', offeringsError);
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize RevenueCat in App.tsx:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
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
