import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LoadingHumidorsScreenProps {
  message?: string;
}

/**
 * LoadingHumidorsScreen Component
 *
 * A loading screen that shows while humidor data is being loaded.
 * Provides better UX by giving immediate feedback when user clicks "Add to Humidor".
 */
export default function LoadingHumidorsScreen({
  message = 'Loading your humidors...',
}: LoadingHumidorsScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#DC851F" />
        <Text style={styles.loadingText}>{message}</Text>
        <Text style={styles.subText}>Preparing your humidor selection...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
});
