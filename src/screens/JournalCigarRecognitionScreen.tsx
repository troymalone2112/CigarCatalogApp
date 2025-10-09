import React, { useState } from 'react';
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
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Cigar, RecognitionMode } from '../types';
import { APIService } from '../services/apiService';
import { normalizeStrength } from '../utils/helpers';
import { getStrengthInfo } from '../utils/strengthUtils';

type JournalCigarRecognitionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JournalCigarRecognition'>;

interface RecognitionResult {
  recognition?: any;
  details?: any;
  enrichedCigar: Partial<Cigar>;
  confidence: number;
  mode: RecognitionMode;
  sources: string[];
}

export default function JournalCigarRecognitionScreen() {
  const navigation = useNavigation<JournalCigarRecognitionScreenNavigationProp>();
  
  // Camera states
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const [camera, setCamera] = useState<CameraView | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Recognition states
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>(RecognitionMode.HYBRID);
  
  const [showCamera, setShowCamera] = useState(false);

  const handleCameraCapture = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to identify cigars');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleManualEntry = () => {
    navigation.navigate('JournalManualEntry');
  };

  const takePicture = async () => {
    if (camera) {
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setImageUri(photo.uri);
        setShowCamera(false);
        // Use base64 data for API calls instead of file URI
        const base64Image = `data:image/jpeg;base64,${photo.base64}`;
        await processImage(base64Image);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        // Use base64 data for API calls instead of file URI
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
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
        imageUri: uri
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
      // Convert RecognitionResult to Cigar for navigation
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
      navigation.navigate('JournalInitialNotes', { cigar });
    }
  };

  const getStrengthColor = (strength: string) => {
    return getStrengthInfo(strength).color;
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
            <Text style={styles.processingText}>Analyzing your cigar...</Text>
            <Text style={styles.processingSubtext}>This may take a few moments</Text>
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
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.cigarImage} />
            )}
            
            <View style={styles.cigarInfo}>
              <Text style={styles.cigarBrand}>{recognitionResult.enrichedCigar.brand}</Text>
              <Text style={styles.cigarLine}>{recognitionResult.enrichedCigar.line}</Text>
              <Text style={styles.cigarName}>{recognitionResult.enrichedCigar.name}</Text>
              
              <View style={styles.strengthContainer}>
                <View style={[styles.strengthPill, { backgroundColor: getStrengthColor(recognitionResult.enrichedCigar.strength || 'Medium') }]}>
                  <Text style={styles.strengthText}>{normalizeStrength(recognitionResult.enrichedCigar.strength || 'Medium')}</Text>
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
                  <Text style={styles.tobaccoText}>{recognitionResult.enrichedCigar.tobaccoOrigin}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.logButton}
            onPress={handleLogExperience}
          >
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
            Take a photo or enter details manually to identify the cigar you're about to enjoy
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleCameraCapture}
              disabled={isProcessing}
            >
              <Text style={styles.primaryButtonText}>
                {isProcessing ? 'Identifying...' : 'Take Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleManualEntry}
            >
              <Ionicons name="create" size={24} color="#7C2D12" />
              <Text style={styles.secondaryButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Modal */}
        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing={type}
              ref={setCamera}
            >
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                
                <View style={styles.cameraButtonRow}>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={pickImageFromGallery}
                  >
                    <Ionicons name="images" size={24} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <Ionicons name="camera" size={32} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={() => setType(type === 'back' ? 'front' : 'back')}
                  >
                    <Ionicons name="camera-reverse" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        </Modal>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tobaccoBackgroundImage: {
    opacity: 0.25,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#7C2D12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#7C2D12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  secondaryButtonText: {
    color: '#7C2D12',
    fontSize: 18,
    fontWeight: '600',
  },
  cigarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cigarImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  cigarInfo: {
    gap: 12,
  },
  cigarBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CCCCCC',
  },
  cigarLine: {
    fontSize: 18,
    color: '#A16207',
  },
  cigarName: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  strengthContainer: {
    alignSelf: 'flex-start',
  },
  strengthPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  strengthText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  overviewSection: {
    marginTop: 8,
  },
  tobaccoSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  tobaccoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  logButton: {
    backgroundColor: '#7C2D12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    margin: 20,
    gap: 12,
  },
  logButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  processingText: {
    fontSize: 18,
    color: '#CCCCCC',
    marginTop: 20,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  cameraButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  galleryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: 'rgba(124, 45, 18, 0.8)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
