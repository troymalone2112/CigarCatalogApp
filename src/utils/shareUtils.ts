/**
 * Share utilities for sharing cigar information with images
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform, Alert } from 'react-native';

export interface ShareCigarOptions {
  cigar: {
    brand?: string;
    name?: string;
    line?: string;
    imageUrl?: string;
    strength?: string;
    overview?: string;
  };
  message?: string;
}

/**
 * Shares a cigar with its image and text information
 * Uses expo-sharing for reliable image sharing across platforms
 */
export async function shareCigar(options: ShareCigarOptions): Promise<void> {
  const { cigar, message } = options;
  const brand = cigar.brand || 'Unknown Brand';
  const name = cigar.name || cigar.line || 'Cigar';
  const strength = cigar.strength ? `\nStrength: ${cigar.strength}` : '';
  const notes = cigar.overview ? `\nNotes: ${cigar.overview}` : '';
  const defaultMessage = `${brand} ${name}${strength}${notes}`.trim();
  const shareMessage = message || defaultMessage;

  const imageUrl = cigar.imageUrl;

  // If no image, just share text
  if (!imageUrl || imageUrl === 'placeholder') {
    try {
      await Share.share({ message: shareMessage });
      return;
    } catch (error) {
      console.error('Error sharing text:', error);
      Alert.alert('Error', 'Unable to share. Please try again.');
      return;
    }
  }

  // Try to share image with text
  try {
    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      // Fallback to text-only sharing
      await Share.share({ message: `${shareMessage}\n\nImage: ${imageUrl}` });
      return;
    }

    // Determine file extension from URL or default to jpg
    let fileExtension = 'jpg';
    const extMatch = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    if (extMatch) {
      fileExtension = extMatch[1].toLowerCase();
    }

    // Create a unique filename with cigar info
    const sanitizedBrand = brand.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `cigar_${sanitizedBrand}_${sanitizedName}.${fileExtension}`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Download or copy the image to cache
    let localFileUri = fileUri;
    try {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Remote image - download it
        console.log('📥 Downloading image for sharing:', imageUrl);
        const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
        localFileUri = downloadResult.uri;
      } else if (imageUrl.startsWith('file://') || imageUrl.startsWith('ph://') || imageUrl.startsWith('content://')) {
        // Local file - copy it to cache
        console.log('📋 Copying local image for sharing:', imageUrl);
        await FileSystem.copyAsync({
          from: imageUrl,
          to: fileUri,
        });
        localFileUri = fileUri;
      } else {
        // Assume it's a local asset path
        console.log('📋 Copying asset image for sharing:', imageUrl);
        await FileSystem.copyAsync({
          from: imageUrl,
          to: fileUri,
        });
        localFileUri = fileUri;
      }

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(localFileUri);
      if (!fileInfo.exists) {
        throw new Error('Downloaded/copied image file not found');
      }

      console.log('✅ Image ready for sharing:', localFileUri);

      // Try React Native Share API first (supports both image and message on iOS)
      try {
        await Share.share({
          message: shareMessage,
          url: localFileUri, // iOS will include both image and message
        });
        console.log('✅ Share completed successfully with message');
        return;
      } catch (shareError) {
        console.log('⚠️ React Native Share failed, trying expo-sharing:', shareError);
        // Fallback to expo-sharing (image only, no message)
        await Sharing.shareAsync(localFileUri, {
          mimeType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
          dialogTitle: `Share ${brand} ${name}`,
        });
        console.log('✅ Share completed successfully (image only)');
      }
    } catch (imageError) {
      console.error('❌ Error preparing image for share:', imageError);
      // Fallback to text-only sharing with image URL
      try {
        await Share.share({
          message: `${shareMessage}\n\nImage: ${imageUrl}`,
        });
      } catch (textError) {
        console.error('❌ Error sharing text fallback:', textError);
        Alert.alert('Error', 'Unable to share. Please try again.');
      }
    }
  } catch (error) {
    console.error('❌ Error in shareCigar:', error);
    // Final fallback to text-only
    try {
      await Share.share({ message: shareMessage });
    } catch (finalError) {
      console.error('❌ Final share fallback failed:', finalError);
      Alert.alert('Error', 'Unable to share. Please try again.');
    }
  }
}

