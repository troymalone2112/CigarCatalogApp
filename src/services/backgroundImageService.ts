import { Image } from 'react-native';

/**
 * Background Image Service
 *
 * This service provides a cached version of the tobacco background image
 * to prevent reloading the same image multiple times throughout the app.
 *
 * The image is cached at the module level, so it's only loaded once
 * and reused across all screens that need it.
 */

// Cache the background image at module level
let cachedBackgroundImage: any = null;

/**
 * Get the cached background image source
 * @returns The cached image source object
 */
export const getBackgroundImageSource = () => {
  if (!cachedBackgroundImage) {
    console.log('🖼️ Loading tobacco background image for first time...');
    cachedBackgroundImage = require('../../assets/tobacco-leaves-bg.jpg');
  }
  return cachedBackgroundImage;
};

/**
 * Preload the background image to ensure it's cached
 * This should be called during app initialization
 */
export const preloadBackgroundImage = async (): Promise<void> => {
  try {
    console.log('🖼️ Preloading tobacco background image...');
    const imageSource = getBackgroundImageSource();

    // Use Image.prefetch to preload the image
    await Image.prefetch(Image.resolveAssetSource(imageSource).uri);
    console.log('✅ Tobacco background image preloaded successfully');
  } catch (error) {
    console.error('❌ Failed to preload background image:', error);
  }
};

/**
 * Get the background image source with preloading
 * This ensures the image is cached before use
 */
export const getCachedBackgroundImage = () => {
  return getBackgroundImageSource();
};

/**
 * Clear the background image cache (useful for memory management)
 */
export const clearBackgroundImageCache = () => {
  cachedBackgroundImage = null;
  console.log('🗑️ Background image cache cleared');
};

/**
 * Check if the background image is cached
 */
export const isBackgroundImageCached = (): boolean => {
  return cachedBackgroundImage !== null;
};










