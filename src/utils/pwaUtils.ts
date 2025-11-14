/**
 * PWA utility functions for detecting standalone mode and managing PWA features
 */

import { Platform } from 'react-native';

/**
 * Check if the app is running in standalone mode (added to home screen)
 */
export const isStandalone = (): boolean => {
  if (Platform.OS !== 'web') {
    return false;
  }

  // Check for standalone mode indicators
  if (typeof window !== 'undefined') {
    // iOS Safari
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    // Android Chrome
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    // General PWA check
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return true;
    }
    // Check if launched from home screen (no browser chrome)
    if (
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: browser)').matches === false
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  if (Platform.OS !== 'web') {
    return Platform.OS === 'ios';
  }

  if (typeof window !== 'undefined' && window.navigator) {
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  }

  return false;
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  if (Platform.OS !== 'web') {
    return Platform.OS === 'android';
  }

  if (typeof window !== 'undefined' && window.navigator) {
    return /Android/.test(window.navigator.userAgent);
  }

  return false;
};

/**
 * Show instructions for adding to home screen
 */
export const showAddToHomeScreenInstructions = (): string => {
  if (isIOS()) {
    return 'To get the full app experience:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"\n4. Open the app from your home screen';
  } else if (isAndroid()) {
    return 'To install this app:\n\n1. Tap the menu (three dots)\n2. Select "Add to Home screen" or "Install app"\n3. Tap "Add" or "Install"';
  }
  return 'Add this app to your home screen for the best experience';
};

/**
 * Inject CSS to minimize browser UI visibility
 */
export const injectPWAStyles = (): void => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  // Add styles to minimize browser UI
  const styleId = 'pwa-custom-styles';
  if (document.getElementById(styleId)) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html, body, #root {
      margin: 0;
      padding: 0;
      min-height: 100%;
      width: 100%;
      background-color: #0a0a0a;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #ffffff;
    }
  `;

  document.head.appendChild(style);

  // Additional JavaScript to force viewport height
  if (typeof window !== 'undefined') {
    // Set viewport height on load and resize
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    // Force scroll to top to hide address bar (iOS Safari)
    if (isIOS()) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 100);
      });
    }
  }
};

/**
 * Initialize PWA features
 */
export const initializePWA = (): void => {
  if (Platform.OS !== 'web') {
    return;
  }

  injectPWAStyles();
};

