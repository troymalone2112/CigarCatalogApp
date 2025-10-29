import React from 'react';
import { ImageBackground, ImageBackgroundProps, StyleSheet } from 'react-native';
import { getCachedBackgroundImage } from '../services/backgroundImageService';

interface CachedBackgroundImageProps extends Omit<ImageBackgroundProps, 'source'> {
  children: React.ReactNode;
}

/**
 * CachedBackgroundImage Component
 * 
 * A wrapper around ImageBackground that uses the cached tobacco background image.
 * This prevents the image from being reloaded every time a screen renders,
 * significantly improving performance and reducing lag.
 */
export default function CachedBackgroundImage({ 
  children, 
  style, 
  imageStyle,
  ...props 
}: CachedBackgroundImageProps) {
  return (
    <ImageBackground
      source={getCachedBackgroundImage()}
      style={[styles.defaultStyle, style]}
      imageStyle={[styles.defaultImageStyle, imageStyle]}
      {...props}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  defaultStyle: {
    flex: 1,
  },
  defaultImageStyle: {
    opacity: 0.3,
    resizeMode: 'cover',
  },
});



