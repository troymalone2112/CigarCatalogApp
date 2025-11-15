/**
 * Web-compatible camera component using getUserMedia
 * Provides a camera interface similar to expo-camera's CameraView
 */

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WebCameraViewProps {
  style?: any;
  facing?: 'front' | 'back';
  onCameraReady?: () => void;
  onCameraError?: (error: Error) => void;
  children?: React.ReactNode;
}

export interface WebCameraViewRef {
  getVideoElement: () => HTMLVideoElement | null;
}

export const WebCameraView = forwardRef<WebCameraViewRef, WebCameraViewProps>(({
  style,
  facing = 'back',
  onCameraReady,
  onCameraError,
  children,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
  }));
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // On native, this component shouldn't be used
      return;
    }

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing === 'front' ? 'user' : 'environment',
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
            onCameraReady?.();
          };
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to access camera';
        setError(errorMessage);
        onCameraError?.(err);
      }
    };

    startCamera();

    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facing, onCameraReady, onCameraError]);

  if (Platform.OS !== 'web') {
    return null;
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-outline" size={48} color="#DC851F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />
      {children}
    </View>
  );
});

/**
 * Hook to capture a photo from the video stream
 */
export const useWebCameraCapture = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const capturePhoto = async (options?: { quality?: number; base64?: boolean }): Promise<{
    uri: string;
    base64?: string;
  }> => {
    if (!videoRef.current) {
      throw new Error('Video element not available');
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(video, 0, 0);

    const dataURL = canvas.toDataURL('image/jpeg', options?.quality || 0.8);
    let base64: string | undefined;

    if (options?.base64) {
      // Extract base64 without data: prefix
      base64 = dataURL.split(',')[1];
    }

    return {
      uri: dataURL,
      base64,
    };
  };

  return { capturePhoto };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#DC851F',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
});

