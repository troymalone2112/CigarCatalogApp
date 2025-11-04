import { Cigar } from '../types';
import { cigarImageManifest } from './cigarImageManifest';

/**
 * Service for managing cigar images
 * Handles image loading, fallbacks, and path resolution
 */
export class CigarImageService {
  /**
   * Get the image source for a cigar
   * @param cigar - The cigar object
   * @returns Image source object for React Native Image component
   */
  static getCigarImageSource(cigar: Cigar): any {
    if (!cigar.image_url) {
      // Return placeholder image if no image is available
      return require('../../assets/cigar-placeholder.jpg');
    }

    // Remote URL
    if (/^https?:\/\//i.test(cigar.image_url)) {
      return { uri: cigar.image_url };
    }

    // Manifest-based local mapping (works in production bundles)
    const local = cigarImageManifest[cigar.image_url];
    if (local) return local;

    // Fallback to placeholder
    return require('../../assets/cigar-placeholder.jpg');
  }

  /**
   * Get image source with fallback handling
   * @param cigar - The cigar object
   * @param fallbackImage - Optional custom fallback image
   * @returns Image source object
   */
  static getCigarImageSourceWithFallback(cigar: Cigar, fallbackImage?: any): any {
    if (!cigar.image_url) {
      return fallbackImage || require('../../assets/cigar-placeholder.jpg');
    }

    if (/^https?:\/\//i.test(cigar.image_url)) {
      return { uri: cigar.image_url };
    }

    const local = cigarImageManifest[cigar.image_url];
    if (local) return local;
    return fallbackImage || require('../../assets/cigar-placeholder.jpg');
  }

  /**
   * Check if a cigar has an image available
   * @param cigar - The cigar object
   * @returns Boolean indicating if image is available
   */
  static hasImage(cigar: Cigar): boolean {
    return !!cigar.image_url;
  }

  /**
   * Get all available image filenames for debugging
   * @returns Array of image filenames
   */
  static getAvailableImages(): string[] {
    // Trimmed to avoid bundling unused images; leave empty to skip preloading
    return [];
  }

  /**
   * Preload images for better performance
   * Call this during app initialization
   */
  static preloadImages(): void {
    // No-op: preloading disabled to reduce bundle size
  }
}
