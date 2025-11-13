/**
 * Banner component that prompts users to add the app to their home screen
 * Only shows when not in standalone mode
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isStandalone, isIOS, showAddToHomeScreenInstructions } from '../utils/pwaUtils';

export default function AddToHomeScreenBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    // Check if already dismissed (stored in localStorage)
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('pwa-banner-dismissed');
      if (wasDismissed === 'true') {
        setDismissed(true);
        return;
      }
    }

    // Only show if not in standalone mode
    if (!isStandalone()) {
      // Small delay to avoid showing immediately on load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-banner-dismissed', 'true');
    }
  };

  if (Platform.OS !== 'web' || dismissed || !showBanner || isStandalone()) {
    return null;
  }

  const instructions = showAddToHomeScreenInstructions();

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Ionicons name="home" size={20} color="#DC851F" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Add to Home Screen</Text>
          <Text style={styles.subtitle}>
            {isIOS()
              ? 'Tap Share → Add to Home Screen for full-screen experience'
              : 'Install this app for the best experience'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#CCCCCC" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    zIndex: 10000,
    paddingTop: Platform.OS === 'web' ? 'env(safe-area-inset-top, 0px)' : 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

