import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
