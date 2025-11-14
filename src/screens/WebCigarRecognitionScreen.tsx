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

  const takePicture = async () => {
    try {
      const videoElement = webCameraRef.current?.getVideoElement();
      if (!videoElement) {
        Alert.alert('Error', 'Camera not ready');
        return;
      }
      webVideoRef.current = videoElement;
      const photo = await capturePhoto({ quality: 0.8, base64: true });
      setImageUri(photo.uri);
      setShowCamera(false);
      const base64Image = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
              <View style={styles.cameraOverlay}>
                <View style={styles.overlayTop}>
                  <Text style={styles.overlayText}>Align the cigar within the frame</Text>
                </View>
                <View style={styles.cigarGuideArea}>
                  <View style={styles.cigarGuide} />
                </View>
                <View style={styles.overlayBottom}>
                  <TouchableOpacity
                    style={styles.cameraControlButton}
                    onPress={() => setShowCamera(false)}
                  >
                    <Ionicons name="close" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture} />
                  <TouchableOpacity
                    style={styles.cameraControlButton}
                    onPress={() => setType((prev) => (prev === 'back' ? 'front' : 'back'))}
                  >
                    <Ionicons name="camera-reverse" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </WebCameraView>
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
  overlayTop: {
    alignItems: 'center',
    paddingTop: 40,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cigarGuideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cigarGuide: {
    width: '80%',
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 40,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
});

