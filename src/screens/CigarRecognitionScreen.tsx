import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Cigar, RecognitionResult } from '../types';
import { APIService } from '../services/apiService';
import { StorageService } from '../storage/storageService';
import { getStrengthInfo } from '../utils/strengthUtils';
import StrengthButton from '../components/StrengthButton';

type CigarRecognitionNavigationProp = StackNavigationProp<RootStackParamList, 'CigarRecognition'>;

export default function CigarRecognitionScreen() {
  const navigation = useNavigation<CigarRecognitionNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (camera) {
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setImageUri(photo.uri);
        
        // Process the image separately to avoid misleading error messages
        try {
          await processCigarImage(photo.uri);
        } catch (processError) {
          console.error('Error processing image:', processError);
          Alert.alert('Error', 'Failed to process image for recognition. Please try again.');
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await processCigarImage(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const processCigarImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      // Step 1: Use ChatGPT to recognize the cigar
      const recognition = await APIService.recognizeCigarFromImage(uri);
      
      if (recognition.brand) {
        // Step 2: Use Perplexity to get detailed information
        const details = await APIService.searchCigarDetails(
          recognition.brand,
          recognition.line,
          recognition.name
        );

        // Create a complete cigar object
        const cigar: Cigar = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          brand: recognition.brand,
          line: recognition.line || details.cigar.line || 'Unknown Line',
          name: recognition.name || details.cigar.name || 'Unknown Name',
          size: details.cigar.size || 'Unknown',
          wrapper: details.cigar.wrapper || 'Unknown',
          filler: details.cigar.filler || 'Unknown',
          binder: details.cigar.binder || 'Unknown',
          strength: getStrengthInfo(details.cigar.strength || 'Medium').level,
          flavorProfile: details.cigar.flavorProfile || [],
          tobaccoOrigins: details.cigar.tobaccoOrigins || [],
          smokingExperience: details.cigar.smokingExperience || {
            first: 'No information available',
            second: 'No information available',
            final: 'No information available',
          },
          imageUrl: uri,
          recognitionConfidence: recognition.confidence,
        };

        // Add to recent cigars
        await StorageService.addRecentCigar(cigar);

        setRecognitionResult({
          cigar,
          confidence: recognition.confidence,
        });
      } else {
        Alert.alert(
          'Recognition Failed',
          'Could not identify the cigar from the image. Please try a clearer photo or enter details manually.'
        );
      }
    } catch (error) {
      console.error('Error processing cigar image:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process the image. Please check your internet connection and try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = () => {
    if (recognitionResult) {
      navigation.navigate('CigarDetails', { cigar: recognitionResult.cigar });
    }
  };

  const handleAddToInventory = () => {
    if (recognitionResult) {
      navigation.navigate('AddToInventory', { cigar: recognitionResult.cigar });
    }
  };

  const handleAddToJournal = () => {
    if (recognitionResult) {
      navigation.navigate('AddJournalEntry', { cigar: recognitionResult.cigar });
    }
  };

  const resetRecognition = () => {
    setImageUri(null);
    setRecognitionResult(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Ionicons name="images" size={24} color="white" />
          <Text style={styles.buttonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (imageUri && recognitionResult) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultContainer}>
          <Image source={{ uri: imageUri }} style={styles.resultImage} />
          
          <View style={styles.resultCard}>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>
                Confidence: {Math.round(recognitionResult.confidence)}%
              </Text>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: recognitionResult.confidence > 70 ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.confidenceBadgeText}>
                  {recognitionResult.confidence > 70 ? 'High' : 'Medium'}
                </Text>
              </View>
            </View>

            <Text style={styles.cigarBrand}>{recognitionResult.cigar.brand}</Text>
            <Text style={styles.cigarLine}>{recognitionResult.cigar.line}</Text>
            {recognitionResult.cigar.name !== 'Unknown Name' && (
              <Text style={styles.cigarName}>{recognitionResult.cigar.name}</Text>
            )}

            <View style={styles.quickInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Strength</Text>
                <View style={styles.flavorTags}>
                  <View style={[styles.flavorTag, { backgroundColor: getStrengthInfo(recognitionResult.cigar.strength).color }]}>
                    <Text style={styles.flavorText}>{getStrengthInfo(recognitionResult.cigar.strength).label}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Wrapper</Text>
                <Text style={styles.infoValue}>{recognitionResult.cigar.wrapper}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryActionButton} onPress={handleViewDetails}>
                <Ionicons name="information-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryActionButton} onPress={handleAddToInventory}>
                <Ionicons name="archive" size={20} color="#8B4513" />
                <Text style={styles.secondaryActionButtonText}>Add to Humidor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryActionButton} onPress={handleAddToJournal}>
                <Ionicons name="create" size={20} color="#8B4513" />
                <Text style={styles.secondaryActionButtonText}>Add to Journal</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={resetRecognition}>
              <Text style={styles.resetButtonText}>Try Another Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (imageUri && isProcessing) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: imageUri }} style={styles.processingImage} />
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.processingText}>Identifying cigar...</Text>
          <Text style={styles.processingSubtext}>
            Using AI to recognize the brand and fetch details
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        ref={(ref) => setCamera(ref)}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => {
                setType(
                  type === CameraType.back ? CameraType.front : CameraType.back
                );
              }}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.focusFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <View style={styles.placeholder} />
          </View>
        </View>
      </Camera>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Position the cigar in the frame and tap to capture
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
  focusFrame: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    right: '15%',
    height: 200,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  galleryButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 15,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B4513',
  },
  placeholder: {
    width: 54,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  processingImage: {
    width: '100%',
    height: '60%',
    resizeMode: 'cover',
  },
  processingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  resultImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  resultCard: {
    flex: 1,
    padding: 20,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  confidenceText: {
    fontSize: 16,
    color: '#666',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cigarBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cigarLine: {
    fontSize: 18,
    color: '#8B4513',
    marginBottom: 4,
  },
  cigarName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryActionButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
  },
  noPermissionText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    backgroundColor: '#FFA737',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flavorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
