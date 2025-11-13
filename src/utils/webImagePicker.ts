/**
 * Web-compatible image picker utilities
 * Provides file input and camera access for web browsers
 */

import { Platform } from 'react-native';

export interface ImagePickerResult {
  uri: string;
  base64?: string;
  width?: number;
  height?: number;
  cancelled: boolean;
}

/**
 * Convert a File to base64 data URL
 */
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a File to base64 string (without data: prefix)
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get image dimensions from a File
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Launch image library picker (web version using file input)
 */
export const launchImageLibraryAsync = async (options?: {
  mediaTypes?: 'images' | 'videos' | 'all';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
}): Promise<{ canceled: boolean; assets?: ImagePickerResult[] }> => {
  if (Platform.OS !== 'web') {
    // Fallback to expo-image-picker on native
    const ImagePicker = await import('expo-image-picker');
    return ImagePicker.launchImageLibraryAsync(options as any);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        resolve({ canceled: true });
        document.body.removeChild(input);
        return;
      }

      try {
        const dataURL = await fileToDataURL(file);
        const base64 = options?.base64 ? await fileToBase64(file) : undefined;
        const dimensions = await getImageDimensions(file);

        resolve({
          canceled: false,
          assets: [
            {
              uri: dataURL,
              base64,
              width: dimensions.width,
              height: dimensions.height,
              cancelled: false,
            },
          ],
        });
      } catch (error) {
        console.error('Error processing image:', error);
        resolve({ canceled: true });
      } finally {
        document.body.removeChild(input);
      }
    };

    input.oncancel = () => {
      resolve({ canceled: true });
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
};

/**
 * Request camera permission (web version)
 */
export const requestCameraPermissionsAsync = async (): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> => {
  if (Platform.OS !== 'web') {
    const ImagePicker = await import('expo-image-picker');
    return ImagePicker.requestCameraPermissionsAsync();
  }

  // On web, check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { granted: false, canAskAgain: false };
  }

  try {
    // Try to access camera to check permission
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true, canAskAgain: false };
  } catch (error: any) {
    // Permission denied or not available
    return { granted: false, canAskAgain: true };
  }
};

/**
 * Get camera permissions status (web version)
 */
export const getCameraPermissionsAsync = async (): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> => {
  if (Platform.OS !== 'web') {
    const ImagePicker = await import('expo-image-picker');
    return ImagePicker.getCameraPermissionsAsync();
  }

  // On web, check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { granted: false, canAskAgain: false };
  }

  // Check permission using Permissions API if available
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return { granted: result.state === 'granted', canAskAgain: result.state === 'prompt' };
    } catch {
      // Permissions API not fully supported, fall through to getUserMedia check
    }
  }

  // Fallback: try to access camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true, canAskAgain: false };
  } catch {
    return { granted: false, canAskAgain: true };
  }
};

