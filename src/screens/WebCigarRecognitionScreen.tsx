import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Cigar, RecognitionMode } from '../types';
import { APIService } from '../services/apiService';
import { getStrengthInfo } from '../utils/strengthUtils';
import {
  launchImageLibraryAsync,
  getCameraPermissionsAsync,
  requestCameraPermissionsAsync,
} from '../utils/webImagePicker';
import { WebCameraView, useWebCameraCapture, WebCameraViewRef } from '../components/WebCameraView';
import { useRecognitionFlow } from '../contexts/RecognitionFlowContext';

type WebRecognitionNavigationProp = StackNavigationProp<RootStackParamList, 'CigarRecognition'>;

interface RecognitionResult {
  recognition?: any;
  details?: any;
  enrichedCigar: Partial<Cigar>;
  confidence: number;
  mode: RecognitionMode;
  sources: string[];
}

export default function WebCigarRecognitionScreen({ route }: { route?: any }) {
  const navigation = useNavigation<WebRecognitionNavigationProp>();
  const { startRecognitionFlow } = useRecognitionFlow();
  const humidorId = route?.params?.humidorId;

  const [permission, setPermission] = useState<{ granted: boolean; canAskAgain: boolean } | null>(
    null,
  );
  const [type, setType] = useState<'front' | 'back'>('back');
  const webCameraRef = useRef<WebCameraViewRef>(null);
  const webVideoRef = useRef<HTMLVideoElement>(null);
  const { capturePhoto } = useWebCameraCapture(webVideoRef);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>(RecognitionMode.HYBRID);
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState(0);

  const processingMessages = [
    'Identifying brand, tobacco, aging, and origin...',
    'Analyzing cigar band details...',
    'Pulling flavor profiles and tasting notes...',
    'Fetching ratings from Cigar Aficionado...',
    'Compiling manufacturer info...',
    'Gathering user reviews...',
    'Finalizing your cigar profile...',
  ];

  useEffect(() => {
    const initPermissions = async () => {
      const perm = await getCameraPermissionsAsync();
      setPermission(perm);
    };
    initPermissions();
  }, []);

  useEffect(() => {
    if (isProcessing) {
      setCurrentProcessingMessage(0);
      const interval = setInterval(() => {
        setCurrentProcessingMessage((prev) =>
          prev < processingMessages.length - 1 ? prev + 1 : 0,
        );
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isProcessing, processingMessages.length]);

  const handleCameraCapture = async () => {
    const perm = await requestCameraPermissionsAsync();
    setPermission(perm);
    if (!perm.granted) {
      Alert.alert('Camera Permission', 'Camera permission is required to identify cigars');
      return;
    }
    setShowCamera(true);
  };

  const cropToGuideArea = (uri: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return new Promise<{ uri: string; base64: string } | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const width = image.width;
        const height = image.height;
        const cropWidth = width * 0.92;
        const cropHeight = height * 0.3;
        const cropX = (width - cropWidth) / 2;
        const cropY = (height - cropHeight) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          uri: dataUrl,
          base64: dataUrl.split(',')[1],
        });
      };
      image.onerror = () => resolve(null);
      image.src = uri;
    });
  };

  const takePicture = async () => {
    try {
      const videoElement = webCameraRef.current?.getVideoElement();
      if (!videoElement) {
        Alert.alert('Error', 'Camera not ready');
        return;
      }
      webVideoRef.current = videoElement;
      const photo = await capturePhoto({ quality: 0.9, base64: true });
      const cropped = (await cropToGuideArea(photo.uri)) || {
        uri: photo.uri,
        base64: photo.base64,
      };
      setImageUri(cropped.uri);
      setShowCamera(false);
      const base64Image = cropped.base64 ? `data:image/jpeg;base64,${cropped.base64}` : cropped.uri;
      await processImage(base64Image);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        const base64Image = result.assets[0].base64
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : result.assets[0].uri;
        await processImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async (uri: string) => {
    try {
      setIsProcessing(true);
      const result = await APIService.recognizeCigar(recognitionMode, {
        imageUri: uri,
      });
      setRecognitionResult(result);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to identify cigar. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogExperience = () => {
    if (recognitionResult) {
      const cigar: Cigar = {
        id: Date.now().toString(),
        brand: recognitionResult.enrichedCigar.brand || 'Unknown',
        line: recognitionResult.enrichedCigar.line || '',
        name: recognitionResult.enrichedCigar.name || '',
        size: recognitionResult.enrichedCigar.size || '',
        wrapper: recognitionResult.enrichedCigar.wrapper || '',
        filler: recognitionResult.enrichedCigar.filler || '',
        binder: recognitionResult.enrichedCigar.binder || '',
        tobacco: recognitionResult.enrichedCigar.tobacco || '',
        strength: recognitionResult.enrichedCigar.strength || 'Medium',
        flavorProfile: recognitionResult.enrichedCigar.flavorProfile || [],
        tobaccoOrigins: recognitionResult.enrichedCigar.tobaccoOrigins || [],
        smokingExperience: recognitionResult.enrichedCigar.smokingExperience || {
          first: '',
          second: '',
          final: '',
        },
        imageUrl: imageUri || undefined,
        recognitionConfidence: recognitionResult.confidence,
        overview: recognitionResult.enrichedCigar.overview,
        tobaccoOrigin: recognitionResult.enrichedCigar.tobaccoOrigin,
        flavorTags: recognitionResult.enrichedCigar.flavorTags,
        cigarAficionadoRating: recognitionResult.enrichedCigar.cigarAficionadoRating,
      };
      startRecognitionFlow(cigar, recognitionResult.enrichedCigar.singleStickPrice || '0');
      navigation.navigate('NewJournalEntry', { cigar });
    }
  };

  if (isProcessing) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.fullScreenBackground}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.container}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#7C2D12" />
            <Text style={styles.processingText}>{processingMessages[currentProcessingMessage]}</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (recognitionResult) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.fullScreenBackground}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cigarCard}>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.cigarImage} />}

            <View style={styles.cigarInfo}>
              <Text style={styles.cigarBrand}>{recognitionResult.enrichedCigar.brand}</Text>
              <Text style={styles.cigarLine}>{recognitionResult.enrichedCigar.line}</Text>
              <Text style={styles.cigarName}>{recognitionResult.enrichedCigar.name}</Text>

              <View style={styles.strengthContainer}>
                <View style={styles.flavorTags}>
                  <View
                    style={[
                      styles.flavorTag,
                      {
                        backgroundColor: getStrengthInfo(
                          recognitionResult.enrichedCigar.strength || 'Medium',
                        ).color,
                      },
                    ]}
                  >
                    <Text style={styles.flavorText}>
                      {getStrengthInfo(recognitionResult.enrichedCigar.strength || 'Medium').label}
                    </Text>
                  </View>
                </View>
              </View>

              {recognitionResult.enrichedCigar.overview && (
                <View style={styles.overviewSection}>
                  <Text style={styles.sectionTitle}>Overview</Text>
                  <Text style={styles.overviewText}>{recognitionResult.enrichedCigar.overview}</Text>
                </View>
              )}

              {recognitionResult.enrichedCigar.tobaccoOrigin && (
                <View style={styles.tobaccoSection}>
                  <Text style={styles.sectionTitle}>Tobacco Origin</Text>
                  <Text style={styles.tobaccoText}>
                    {recognitionResult.enrichedCigar.tobaccoOrigin}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.logButton} onPress={handleLogExperience}>
            <Ionicons name="create" size={20} color="white" />
            <Text style={styles.logButtonText}>Let's Smoke!</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="camera" size={80} color="#DC851F" />
          </View>

          <Text style={styles.subtitle}>
            Take a photo or choose one from your library to identify the cigar you're about to enjoy
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCameraCapture}
              disabled={isProcessing}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.primaryButtonText}>
                {isProcessing ? 'Identifying...' : 'Take Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickImageFromGallery}
              disabled={isProcessing}
            >
              <Ionicons name="images" size={24} color="#7C2D12" />
              <Text style={styles.secondaryButtonText}>Choose from Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('JournalManualEntry')}
            >
              <Ionicons name="search" size={24} color="#7C2D12" />
              <Text style={styles.secondaryButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <WebCameraView
              style={styles.camera}
              facing={type}
              ref={webCameraRef}
              onCameraReady={() => {
                const videoElement = webCameraRef.current?.getVideoElement();
                if (videoElement) {
                  webVideoRef.current = videoElement;
                }
              }}
              onCameraError={(err) => {
                console.error('Camera error:', err);
                Alert.alert('Camera Error', err.message || 'Failed to access camera');
              }}
            >
              <View style={styles.cameraOverlay} pointerEvents="none">
                <View style={[styles.overlayShade, styles.overlayTop]} />
                <View style={styles.overlayMiddle}>
                  <View style={[styles.overlayShade, styles.overlaySide]} />
                  <View style={styles.cigarGuideArea}>
                    <View style={styles.cigarGuide} />
                  </View>
                  <View style={[styles.overlayShade, styles.overlaySide]} />
                </View>
                <View style={[styles.overlayShade, styles.overlayBottom]} />
              </View>
            </WebCameraView>

            <View style={styles.captureControls}>
              <TouchableOpacity
                style={styles.cameraControlButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <Ionicons name="camera" size={26} color="#0a0a0a" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraControlButton}
                onPress={() => setType((prev) => (prev === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
  },
  tobaccoBackgroundImage: {
    opacity: 0.3,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#DC851F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  subtitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#DC851F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#7C2D12',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  cigarCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  cigarImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  cigarInfo: {
    gap: 12,
  },
  cigarBrand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cigarLine: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  cigarName: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  strengthContainer: {
    marginTop: 8,
  },
  flavorTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  flavorTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  flavorText: {
    color: '#111',
    fontWeight: '600',
  },
  overviewSection: {
    marginTop: 12,
  },
  sectionTitle: {
    color: '#DC851F',
    fontSize: 16,
    marginBottom: 4,
  },
  overviewText: {
    color: '#CCCCCC',
    lineHeight: 20,
  },
  tobaccoSection: {
    marginTop: 12,
  },
  tobaccoText: {
    color: '#CCCCCC',
  },
  logButton: {
    backgroundColor: '#DC851F',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: 20,
    paddingBottom: 140,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayShade: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  overlayTop: {
    flex: 1,
  },
  overlayMiddle: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    height: '100%',
  },
  cigarGuideArea: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  cigarGuide: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  overlayBottom: {
    flex: 1,
  },
  captureControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  cameraControlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#DC851F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});

