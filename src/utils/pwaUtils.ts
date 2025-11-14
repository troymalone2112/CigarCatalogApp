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
    /* Force full viewport - hide Safari UI */
    html {
      height: 100%;
      height: -webkit-fill-available;
      overflow: hidden;
      position: fixed;
      width: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      height: -webkit-fill-available;
      overflow: hidden;
      position: fixed;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    #root {
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      position: relative;
    }
    
    /* iOS Safari specific - aggressive UI hiding */
    @supports (-webkit-touch-callout: none) {
      html, body {
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Force viewport to fill screen */
      body {
        min-height: 100vh;
        min-height: -webkit-fill-available;
      }
    }
    
    /* Prevent text selection on UI elements */
    button, a, [role="button"], [onClick] {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    
    /* Safe area insets - make safe areas black */
    @supports (padding: max(0px)) {
      /* Remove safe area padding - we want full screen */
      body {
        padding-top: 0;
        padding-bottom: 0;
        padding-left: 0;
        padding-right: 0;
        background-color: #0a0a0a;
      }
      
      /* Make safe area regions black */
      html::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: env(safe-area-inset-top);
        background-color: #0a0a0a;
        z-index: 9999;
        pointer-events: none;
      }
      
      html::after {
        content: '';
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: env(safe-area-inset-bottom);
        background-color: #0a0a0a;
        z-index: 9999;
        pointer-events: none;
      }
      
      /* Make header extend into safe area with black background */
      header, [data-header] {
        padding-top: env(safe-area-inset-top);
        background-color: #0a0a0a;
      }
      
      /* Make footer extend into safe area with black background */
      footer, [data-footer] {
        padding-bottom: env(safe-area-inset-bottom);
        background-color: #0a0a0a;
      }
    }
    
    /* Hide scrollbars but allow scrolling */
    ::-webkit-scrollbar {
      display: none;
    }
    * {
      -ms-overflow-style: none;
      scrollbar-width: none;
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

  // Inject PWA styles
  injectPWAStyles();

  // Hint browsers to reduce double-tap zoom without blocking gestures
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.touchAction = 'manipulation';
  }
};

