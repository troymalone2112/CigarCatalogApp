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
    /* Full viewport height - prevent browser UI from showing */
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: fixed;
    }
    
    #root {
      width: 100%;
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    /* iOS Safari specific - minimize UI */
    @supports (-webkit-touch-callout: none) {
      body {
        -webkit-touch-callout: none;
        overscroll-behavior: none;
        -webkit-overflow-scrolling: touch;
      }
    }
    
    /* Prevent text selection on UI elements */
    button, a, [role="button"] {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    
    /* Safe area insets for notched devices */
    @supports (padding: max(0px)) {
      body {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    }
    
    /* Hide address bar on scroll (iOS Safari) */
    @media screen and (max-width: 768px) {
      html {
        height: -webkit-fill-available;
      }
      body {
        min-height: 100vh;
        min-height: -webkit-fill-available;
      }
    }
  `;

  document.head.appendChild(style);
};

/**
 * Initialize PWA features
 */
export const initializePWA = (): void => {
  if (Platform.OS !== 'web') {
    return;
  }

  // Inject PWA styles
  injectPWAStyles();

  // Prevent default touch behaviors
  if (typeof document !== 'undefined') {
    document.addEventListener('touchmove', (e) => {
      // Allow scrolling in scrollable containers
      const target = e.target as HTMLElement;
      if (target && (target.scrollHeight > target.clientHeight || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      // Prevent default for body scroll
      if (target === document.body || target === document.documentElement) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
};

