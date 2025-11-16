import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Linking,
  ImageBackground,
  Platform,
} from 'react-native';
import {
  CameraView,
  CameraType,
  CameraCapturedPicture,
  CameraMountError,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Cigar, RecognitionMode } from '../types';
import { APIService } from '../services/apiService';
import { DatabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { useRecognitionFlow } from '../contexts/RecognitionFlowContext';
import { getStrengthInfo } from '../utils/strengthUtils';
import StrengthButton from '../components/StrengthButton';
import { StorageService } from '../storage/storageService';
import { OptimizedHumidorService } from '../services/optimizedHumidorService';
import { findDuplicateCigar, getCigarDisplayName } from '../utils/duplicateDetection';
import { RecognitionErrorHandler } from '../utils/recognitionErrorHandler';
import LoadingHumidorsScreen from './LoadingHumidorsScreen';

type CigarRecognitionNavigationProp = StackNavigationProp<RootStackParamList, 'CigarRecognition'>;

interface RecognitionResult {
  recognition?: any;
  details?: any;
  enrichedCigar: Partial<Cigar>;
  confidence: number;
  mode: RecognitionMode;
  sources: string[];
}

const GUIDE_TOP_OVERLAY_HEIGHT = 120;
const GUIDE_CAPTURE_HEIGHT = 200;
const GUIDE_WIDTH_RATIO = 0.92;
const GUIDE_HEIGHT_MULTIPLIER = 1.2;

type ProcessableImage = {
  uri: string;
  width?: number;
  height?: number;
  base64?: string | null;
};

const clampValue = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export default function EnhancedCigarRecognitionScreen({ route }: { route?: any }) {
  const navigation = useNavigation<CigarRecognitionNavigationProp>();
  const { user } = useAuth();
  const { startRecognitionFlow } = useRecognitionFlow();
  const humidorId = route?.params?.humidorId;

  // Camera states
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Recognition states
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>(RecognitionMode.HYBRID);
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState(0);

  // Processing messages to display during cigar identification
  const processingMessages = [
    'Identifying brand, tobacco, aging, and origin...',
    'Analyzing cigar band details...',
    'Pulling flavor profiles and tasting notes...',
    'Fetching ratings from Cigar Aficionado...',
    'Compiling manufacturer info...',
    'Gathering user reviews...',
    'Finalizing your cigar profile...',
  ];

  // Cycle through processing messages when processing
  useEffect(() => {
    if (isProcessing) {
      setCurrentProcessingMessage(0);
      const interval = setInterval(() => {
        setCurrentProcessingMessage((prev) =>
          prev < processingMessages.length - 1 ? prev + 1 : 0,
        );
      }, 3000); // Change message every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isProcessing, processingMessages.length]);

  // Check if we should open search modal on mount
  useEffect(() => {
    if (route?.params?.openSearch) {
      setShowSimpleSearch(true);
    }
  }, [route?.params?.openSearch]);

  useEffect(() => {
    if (route?.params?.manualResult) {
      setRecognitionResult(route.params.manualResult);
      setImageUri(null);
      setShowSimpleSearch(false);
      navigation.setParams({
        ...route.params,
        manualResult: undefined,
      });
    }
  }, [route?.params?.manualResult, navigation, route?.params]);

  // Automatically request camera permission on first load
  useEffect(() => {
    const requestInitialPermission = async () => {
      console.log('📷 Permission state:', permission);
      if (permission && !permission.granted) {
        // Request permission on first load if not already granted
        console.log('📷 Requesting camera permission on first load...');
        const result = await requestPermission();
        console.log('📷 Permission request result:', result);
      }
    };

    // Small delay to ensure component is fully mounted and permission state is loaded
    const timer = setTimeout(requestInitialPermission, 500);
    return () => clearTimeout(timer);
  }, [permission, requestPermission]);

  const handleCameraRef = useCallback((ref: CameraView | null) => {
    console.log(`📸 Camera ref ${ref ? 'set' : 'cleared'}`);
    cameraRef.current = ref;
    if (!ref) {
      setIsCameraReady(false);
    }
  }, []);

  const handleCameraReady = useCallback(() => {
    console.log('📷 Camera ready');
    setIsCameraReady(true);
  }, []);

  const handleCameraMountError = useCallback(
    (event: CameraMountError) => {
      const message = event?.message ?? 'Unable to start the camera. Please try again.';
      console.error('❌ Camera mount error:', message);
      Alert.alert('Camera Error', message);
    },
    [],
  );

  const cropPhotoToGuide = useCallback(
    async (photo: CameraCapturedPicture): Promise<ProcessableImage | null> => {
      try {
        console.log('✂️ Starting cropPhotoToGuide', {
          width: photo?.width,
          height: photo?.height,
          uri: photo?.uri,
        });
        const { width: imageWidth, height: imageHeight } = photo;

        if (!imageWidth || !imageHeight) {
          console.warn('⚠️ Photo dimensions unavailable, skipping crop.');
          return null;
        }

        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

        if (!screenWidth || !screenHeight) {
          return null;
        }

        const captureHeightRatio = GUIDE_CAPTURE_HEIGHT / screenHeight;
        const captureCenterRatio =
          (GUIDE_TOP_OVERLAY_HEIGHT + GUIDE_CAPTURE_HEIGHT / 2) / screenHeight;

        const requestedCropWidth = Math.round(imageWidth * GUIDE_WIDTH_RATIO);
        const safeCropWidth = Math.round(clampValue(requestedCropWidth, 1, imageWidth));

        const requestedCropHeight = imageHeight * captureHeightRatio * GUIDE_HEIGHT_MULTIPLIER;
        const safeCropHeight = Math.round(clampValue(requestedCropHeight, 1, imageHeight));

        const cropX = Math.round(
          clampValue((imageWidth - safeCropWidth) / 2, 0, Math.max(0, imageWidth - safeCropWidth)),
        );

        const captureCenterY = imageHeight * captureCenterRatio;
        const cropY = Math.round(
          clampValue(
            captureCenterY - safeCropHeight / 2,
            0,
            Math.max(0, imageHeight - safeCropHeight),
          ),
        );

        if (safeCropWidth <= 0 || safeCropHeight <= 0) {
          console.warn('⚠️ Computed invalid crop bounds', {
            cropWidth: safeCropWidth,
            cropHeight: safeCropHeight,
            cropX,
            cropY,
          });
          return null;
        }

        const result = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              crop: {
                originX: cropX,
                originY: cropY,
                width: safeCropWidth,
                height: safeCropHeight,
              },
            },
          ],
          {
            compress: 0.85,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        console.log('✂️ Finished cropPhotoToGuide', {
          uri: result?.uri,
          width: result?.width,
          height: result?.height,
          hasBase64: !!result?.base64,
        });
        return result;
      } catch (error) {
        console.error('❌ Failed to crop photo to guide area:', error);
        console.error('✂️ cropPhotoToGuide stack:', (error as Error)?.stack);
        return null;
      }
    },
    [],
  );

  // Manual entry states
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBrand, setManualBrand] = useState('');
  const [manualLine, setManualLine] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualSize, setManualSize] = useState('');

  // Humidor selection modal states
  const [showHumidorSelection, setShowHumidorSelection] = useState(false);
  const [availableHumidors, setAvailableHumidors] = useState<any[]>([]);

  // Simple search states
  const [showSimpleSearch, setShowSimpleSearch] = useState(false);
  const [searchDescription, setSearchDescription] = useState('');

  // Duplicate detection states
  const [inventory, setInventory] = useState<any[]>([]);
  const [duplicateItem, setDuplicateItem] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [manualDescription, setManualDescription] = useState('');

  // Loading states
  const [showLoadingHumidors, setShowLoadingHumidors] = useState(false);
const [isAddingToHumidor, setIsAddingToHumidor] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBrand, setEditBrand] = useState('');
  const [editName, setEditName] = useState('');

  // Hide loading screen when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setShowLoadingHumidors(false);
    };
  }, []);

  // Hide loading screen when focus changes (user navigated away)
  useFocusEffect(
    React.useCallback(() => {
      setShowLoadingHumidors(false);
    }, []),
  );

  // Early return for permission loading state
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2D12" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.errorContainer}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.errorContent}>
          <Ionicons name="camera-outline" size={80} color="#DC851F" />
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorText}>
            This app needs camera access to identify cigars. Please grant permission to continue.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRequestPermission}>
            <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // Quantity input for adding to inventory

  // Settings

  // Permission is now handled by useCameraPermissions hook
  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to identify cigars. Please go to Settings > Privacy & Security > Camera and enable access for this app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              // On iOS, this will open the app settings
              Linking.openSettings();
            },
          },
        ],
      );
    }
  };

  const takePicture = async () => {
    const camera = cameraRef.current;

    console.log('📸 takePicture pressed', {
      hasCamera: !!camera,
      isCameraReady,
      isCapturing,
    });

    if (!camera) {
      console.log('Camera not available');
      Alert.alert('Camera Not Ready', 'Please wait for the camera to initialize.');
      return;
    }

    if (!isCameraReady) {
      Alert.alert('Camera Initializing', 'Hang tight while we finish setting up the camera.');
      return;
    }

    if (isCapturing) {
      console.log('Capture already in progress, ignoring additional tap.');
        return;
      }

    setIsCapturing(true);

    try {
      console.log('📸 Invoking takePictureAsync...');
      const photo = await camera.takePictureAsync({
        quality: 0.85,
          base64: true,
      });
      console.log('📸 Photo captured', {
        uri: photo?.uri,
        width: photo?.width,
        height: photo?.height,
        hasBase64: !!photo?.base64,
      });

      const croppedPhoto = await cropPhotoToGuide(photo);
      const photoForProcessing: ProcessableImage = croppedPhoto ?? photo;

      if (!croppedPhoto) {
        console.log('⚠️ Using uncropped photo for processing (crop unavailable).');
      }

      setImageUri(photoForProcessing.uri);

      // Process the image separately to avoid misleading error messages
      try {
        const base64Image = photoForProcessing.base64
          ? `data:image/jpeg;base64,${photoForProcessing.base64}`
          : photoForProcessing.uri;
        await processCigarImage(base64Image);
      } catch (processError) {
        console.error('Error processing image:', processError);
        Alert.alert('Error', 'Failed to process image for recognition. Please try again.');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      console.error('📸 takePicture stack:', (error as Error)?.stack);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
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
        await processCigarImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processCigarImage = async (uri: string) => {
    setIsProcessing(true);
    setRecognitionResult(null);

    try {
      const mode = RecognitionMode.HYBRID;

      const result = await APIService.recognizeCigar(mode, {
        imageUri: uri,
      });

      setRecognitionResult(result);
      console.log('🎯 Recognition result:', result);
      console.log('💰 MSRP data:', result.enrichedCigar.msrp);
      console.log('🍷 Drink Pairings in recognition result:', result.enrichedCigar.drinkPairings);
      console.log('🍷 Alcoholic pairings:', result.enrichedCigar.drinkPairings?.alcoholic);
      console.log('🍷 Non-alcoholic pairings:', result.enrichedCigar.drinkPairings?.nonAlcoholic);
      console.log('💰 Single stick price data:', result.enrichedCigar.singleStickPrice);
    } catch (error) {
      console.error('Error processing cigar image:', error);

      // Parse the error and show appropriate dialog
      const recognitionError = RecognitionErrorHandler.parseError(error);

      RecognitionErrorHandler.showErrorDialog(
        recognitionError,
        () => processCigarImage(uri), // Retry
        () => setShowManualEntry(true), // Manual entry
        () => {}, // Try later (no action needed)
        () => {
          // Try different photo - go back to camera
          setIsProcessing(false);
          setRecognitionResult(null);
        },
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const processManualEntry = async () => {
    if (!manualBrand.trim()) {
      Alert.alert('Error', 'Brand name is required');
      return;
    }

    setShowManualEntry(false);

    // Create a basic cigar object from manual entry (no API research)
    const cigar: Cigar = {
      id: Date.now().toString(),
      brand: manualBrand.trim(),
      line: manualLine.trim() || 'Unknown Line',
      name: 'Unknown Name', // We removed the name field
      size: manualSize.trim() || 'Unknown Size',
      wrapper: 'Unknown',
      filler: 'Unknown',
      binder: 'Unknown',
      tobacco: 'Unknown',
      strength: 'Medium',
      flavorProfile: [],
      tobaccoOrigins: [],
      smokingExperience: {
        first: 'Unknown',
        second: 'Unknown',
        final: 'Unknown',
      },
      imageUrl: null,
      priceRange: null,
      singleStickPrice: null,
      tobaccoOrigin: 'Unknown',
      flavorTags: [],
      cigarAficionadoRating: null,
    };

    // Navigate directly to AddToInventory for manual entry
    navigation.navigate('AddToInventory', {
      cigar,
      singleStickPrice: null,
      humidorId,
    });
  };

  const handleManualSubmit = async () => {
    await processManualEntry();
  };

  const handleHumidorSelection = (humidorId: string) => {
    setShowHumidorSelection(false);

    // Create cigar object from recognition result
    const cigar: Cigar = {
      id: Date.now().toString(),
      brand: recognitionResult?.enrichedCigar.brand || 'Unknown Brand',
      line: recognitionResult?.enrichedCigar.line || 'Unknown Line',
      name: recognitionResult?.enrichedCigar.name || 'Unknown Name',
      size: recognitionResult?.enrichedCigar.size || 'Unknown Size',
      wrapper: recognitionResult?.enrichedCigar.wrapper || 'Unknown',
      filler: recognitionResult?.enrichedCigar.filler || 'Unknown',
      binder: recognitionResult?.enrichedCigar.binder || 'Unknown',
      tobacco: recognitionResult?.enrichedCigar.tobacco,
      strength: getStrengthInfo(recognitionResult?.enrichedCigar.strength || 'Medium').level,
      flavorProfile: recognitionResult?.enrichedCigar.flavorTags || [],
      tobaccoOrigins: recognitionResult?.enrichedCigar.tobaccoOrigins || [],
      smokingExperience: recognitionResult?.enrichedCigar.smokingExperience || {
        first: 'Unknown',
        second: 'Unknown',
        final: 'Unknown',
      },
      drinkPairings: recognitionResult?.enrichedCigar.drinkPairings,
      imageUrl: recognitionResult?.enrichedCigar.imageUrl,
      singleStickPrice: recognitionResult?.enrichedCigar.singleStickPrice,
      overview: recognitionResult?.enrichedCigar.overview,
      tobaccoOrigin: recognitionResult?.enrichedCigar.tobaccoOrigin,
      flavorTags: recognitionResult?.enrichedCigar.flavorTags,
      cigarAficionadoRating: recognitionResult?.enrichedCigar.cigarAficionadoRating,
    };

    // Navigate through MainTabs to ensure proper stack context
    navigation.navigate('MainTabs', {
      screen: 'HumidorList',
      params: {
        screen: 'AddToInventory',
        params: {
          cigar,
          singleStickPrice: recognitionResult?.enrichedCigar.singleStickPrice,
          humidorId,
        },
      },
    });
  };

  const processSimpleSearch = async () => {
    if (!searchDescription.trim()) {
      Alert.alert('Error', 'Please enter a description of the cigar');
      return;
    }

    setShowSimpleSearch(false);
    setIsProcessing(true);
    setRecognitionResult(null);

    try {
      const result = await APIService.recognizeCigar(RecognitionMode.PERPLEXITY_ONLY, {
        userDescription: searchDescription,
      });

      setRecognitionResult(result);
      console.log('🎯 Search result:', result);
    } catch (error) {
      console.error('Error processing simple search:', error);

      // Parse the error and show appropriate dialog
      const recognitionError = RecognitionErrorHandler.parseError(error);

      RecognitionErrorHandler.showErrorDialog(
        recognitionError,
        () => processSimpleSearch(), // Retry
        () => setShowManualEntry(true), // Manual entry
        () => {}, // Try later (no action needed)
        () => {
          // Try different search terms
          setIsProcessing(false);
          setShowSimpleSearch(true);
        },
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const addToInventoryWithResult = async (result: RecognitionResult) => {
    try {
      // Load current inventory for duplicate detection
      const currentInventory = await StorageService.getInventory();

      const cigar: Cigar = {
        id: Date.now().toString(),
        brand: result.enrichedCigar.brand || 'Unknown Brand',
        line: result.enrichedCigar.line || 'Unknown Line',
        name: result.enrichedCigar.name || 'Unknown Name',
        size: result.enrichedCigar.size || 'Unknown Size',
        wrapper: result.enrichedCigar.wrapper || 'Unknown',
        filler: result.enrichedCigar.filler || 'Unknown',
        binder: result.enrichedCigar.binder || 'Unknown',
        tobacco: result.enrichedCigar.tobacco,
        strength: getStrengthInfo(result.enrichedCigar.strength || 'Medium').level,
        flavorProfile: result.enrichedCigar.flavorTags || [],
        tobaccoOrigins: result.enrichedCigar.tobaccoOrigins || [],
        smokingExperience: result.enrichedCigar.smokingExperience || {
          first: 'Unknown',
          second: 'Unknown',
          final: 'Unknown',
        },
        drinkPairings: result.enrichedCigar.drinkPairings,
        imageUrl: result.enrichedCigar.imageUrl || null,
        priceRange: result.enrichedCigar.priceRange,
        singleStickPrice: result.enrichedCigar.singleStickPrice,
        tobaccoOrigin: result.enrichedCigar.tobaccoOrigin,
        flavorTags: result.enrichedCigar.flavorTags,
        cigarAficionadoRating: result.enrichedCigar.cigarAficionadoRating,
      };

      // Check for duplicates
      const duplicate = findDuplicateCigar(cigar, currentInventory);

      if (duplicate) {
        // Show duplicate dialog
        setDuplicateItem(duplicate);
        setShowDuplicateDialog(true);
      } else {
        // No duplicate found, proceed normally
        navigation.navigate('AddToInventory', {
          cigar,
          singleStickPrice: result.enrichedCigar.singleStickPrice,
          humidorId,
        });
      }
    } catch (error) {
      console.error('Error adding to inventory:', error);
      Alert.alert('Error', 'Failed to add cigar to inventory. Please try again.');
    } finally {
      setIsAddingToHumidor(false);
      setShowLoadingHumidors(false);
    }
  };

  const addToInventory = async () => {
    if (isAddingToHumidor) {
      console.log('⚠️ Add to Humidor already in progress, ignoring press');
      return;
    }
    console.log('🔍 Add to Humidor button pressed!');
    console.log('🔍 Current humidorId:', humidorId);
    console.log('🔍 Recognition result:', recognitionResult);

    if (!recognitionResult) {
      console.error('No recognition result available');
      return;
    }

    // Show loading screen IMMEDIATELY for better UX
    if (!humidorId) {
      setShowLoadingHumidors(true);
    }

    console.log('Starting addToInventory with result:', recognitionResult);
    try {
      setIsAddingToHumidor(true);
      // Create cigar object first (fast)
      const cigar: Cigar = {
        id: Date.now().toString(),
        brand: recognitionResult.enrichedCigar.brand || 'Unknown Brand',
        line: recognitionResult.enrichedCigar.line || 'Unknown Line',
        name: recognitionResult.enrichedCigar.name || 'Unknown Name',
        size: recognitionResult.enrichedCigar.size || 'Unknown Size',
        wrapper: recognitionResult.enrichedCigar.wrapper || 'Unknown',
        filler: recognitionResult.enrichedCigar.filler || 'Unknown',
        binder: recognitionResult.enrichedCigar.binder || 'Unknown',
        tobacco: recognitionResult.enrichedCigar.tobacco,
        strength: getStrengthInfo(recognitionResult.enrichedCigar.strength || 'Medium').level,
        flavorProfile: recognitionResult.enrichedCigar.flavorTags || [],
        tobaccoOrigins: recognitionResult.enrichedCigar.tobaccoOrigins || [],
        smokingExperience: recognitionResult.enrichedCigar.smokingExperience || {
          first: 'Unknown',
          second: 'Unknown',
          final: 'Unknown',
        },
        drinkPairings: recognitionResult.enrichedCigar.drinkPairings,
        imageUrl: imageUri || recognitionResult.enrichedCigar.imageUrl || 'placeholder',
        recognitionConfidence: recognitionResult.confidence,
        msrp: recognitionResult.enrichedCigar.msrp,
        singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
        releaseYear: recognitionResult.enrichedCigar.releaseYear,
        limitedEdition: recognitionResult.enrichedCigar.limitedEdition,
        professionalRating: recognitionResult.enrichedCigar.professionalRating,
        agingPotential: recognitionResult.enrichedCigar.agingPotential,
        wrapperColor: recognitionResult.enrichedCigar.wrapperColor,
        identifyingFeatures: recognitionResult.enrichedCigar.identifyingFeatures,
        // New detailed fields
        overview: recognitionResult.enrichedCigar.overview,
        tobaccoOrigin: recognitionResult.enrichedCigar.tobaccoOrigin,
        flavorTags: recognitionResult.enrichedCigar.flavorTags,
        cigarAficionadoRating: recognitionResult.enrichedCigar.cigarAficionadoRating,
      };

      // For now, skip duplicate detection to speed up the flow
      // TODO: Implement background duplicate detection if needed
      if (humidorId) {
        // If we have a specific humidor, go directly to AddToInventory
        navigation.navigate('MainTabs', {
          screen: 'HumidorList',
          params: {
            screen: 'AddToInventory',
            params: {
              cigar,
              singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
              humidorId,
            },
          },
        });
      } else {
        // If no humidor specified, navigate to HumidorList with recognition flow parameters
        try {
          console.log('🚀 Navigating to HumidorList with recognition flow');
          console.log('🚀 Navigation params:', {
            fromRecognition: true,
            cigar: cigar.brand,
            singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice || '0',
          });

          // Start recognition flow
          startRecognitionFlow(cigar, recognitionResult.enrichedCigar.singleStickPrice || '0');

          // Navigate immediately (loading screen is already shown)
          console.log('🚀 About to navigate with params:', {
            fromRecognition: true,
            cigar: cigar.brand,
            singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice || '0',
          });

          console.log('🚀 Full navigation object:', {
            screen: 'HumidorList',
            params: {
              screen: 'HumidorListMain',
              params: {
                fromRecognition: true,
                cigar,
                singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice || '0',
              },
            },
          });

          navigation.navigate('MainTabs', {
            screen: 'HumidorList',
            params: {
              screen: 'HumidorListMain',
              params: {
                fromRecognition: true,
                cigar,
                singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice || '0',
              },
            },
          });
        } catch (error) {
          console.error('Error in add to inventory flow:', error);
          // Hide loading screen on error
          setShowLoadingHumidors(false);
          // Fallback - still go to HumidorList with recognition flow
          startRecognitionFlow(cigar, recognitionResult.enrichedCigar.singleStickPrice || '0');

          navigation.navigate('MainTabs', {
            screen: 'HumidorList',
            params: {
              screen: 'HumidorListMain',
              params: {
                fromRecognition: true,
                cigar,
                singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice || '0',
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Error in addToInventory:', error);
      Alert.alert('Error', 'Failed to add cigar to inventory. Please try again.');
      setShowLoadingHumidors(false); // Ensure loading screen is hidden on any error
    }
  };

  const startJournaling = () => {
    if (!recognitionResult) return;

    const cigar: Cigar = {
      id: Date.now().toString(),
      brand: recognitionResult.enrichedCigar.brand || 'Unknown Brand',
      line: recognitionResult.enrichedCigar.line || 'Unknown Line',
      name: recognitionResult.enrichedCigar.name || 'Unknown Name',
      size: recognitionResult.enrichedCigar.size || 'Various sizes',
      wrapper: recognitionResult.enrichedCigar.wrapper || 'Unknown',
      filler: recognitionResult.enrichedCigar.filler || 'Unknown',
      binder: recognitionResult.enrichedCigar.binder || 'Unknown',
      tobacco: recognitionResult.enrichedCigar.tobacco || 'Unknown',
      strength: getStrengthInfo(recognitionResult.enrichedCigar.strength || 'Medium').level,
      flavorProfile: recognitionResult.enrichedCigar.flavorTags || [],
      tobaccoOrigins: recognitionResult.enrichedCigar.tobaccoOrigins || [],
      smokingExperience: {
        first:
          recognitionResult.enrichedCigar.smokingExperience?.first || 'Smooth and approachable',
        second: recognitionResult.enrichedCigar.smokingExperience?.second || 'Develops complexity',
        final: recognitionResult.enrichedCigar.smokingExperience?.final || 'Satisfying finish',
      },
      drinkPairings: recognitionResult.enrichedCigar.drinkPairings,
      imageUrl: imageUri || 'placeholder',
      recognitionConfidence: recognitionResult.confidence,
      msrp: recognitionResult.enrichedCigar.msrp,
      singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
      releaseYear: recognitionResult.enrichedCigar.releaseYear,
      limitedEdition: recognitionResult.enrichedCigar.limitedEdition,
      professionalRating: recognitionResult.enrichedCigar.professionalRating,
      agingPotential: recognitionResult.enrichedCigar.agingPotential,
      wrapperColor: recognitionResult.enrichedCigar.wrapperColor,
      identifyingFeatures: recognitionResult.enrichedCigar.identifyingFeatures,
      overview: recognitionResult.enrichedCigar.overview,
      tobaccoOrigin: recognitionResult.enrichedCigar.tobaccoOrigin,
      flavorTags: recognitionResult.enrichedCigar.flavorTags,
      cigarAficionadoRating: recognitionResult.enrichedCigar.cigarAficionadoRating,
    };

    // Navigate to new single journal entry screen with the recognition image
    navigation.navigate('NewJournalEntry', {
      cigar,
      recognitionImageUrl: imageUri,
    });
  };

  const resetRecognition = () => {
    setImageUri(null);
    setRecognitionResult(null);
    setIsCameraReady(false);
    setIsCapturing(false);
    setManualBrand('');
    setManualLine('');
    setManualName('');
    setManualSize('');
    setManualDescription('');
    setSearchDescription('');
    setShowDuplicateDialog(false);
    setDuplicateItem(null);
  };

  const handleAddToExisting = () => {
    if (!recognitionResult || !duplicateItem) return;

    const cigar: Cigar = {
      id: Date.now().toString(),
      brand: recognitionResult.enrichedCigar.brand || 'Unknown Brand',
      line: recognitionResult.enrichedCigar.line || 'Unknown Line',
      name: recognitionResult.enrichedCigar.name || 'Unknown Name',
      size: recognitionResult.enrichedCigar.size || 'Unknown Size',
      wrapper: recognitionResult.enrichedCigar.wrapper || 'Unknown',
      filler: recognitionResult.enrichedCigar.filler || 'Unknown',
      binder: recognitionResult.enrichedCigar.binder || 'Unknown',
      tobacco: recognitionResult.enrichedCigar.tobacco,
      strength: recognitionResult.enrichedCigar.strength || 'Medium',
      flavorProfile: recognitionResult.enrichedCigar.flavorTags || [],
      tobaccoOrigins: recognitionResult.enrichedCigar.tobaccoOrigins || [],
      smokingExperience: recognitionResult.enrichedCigar.smokingExperience || {
        first: 'Unknown',
        second: 'Unknown',
        final: 'Unknown',
      },
      drinkPairings: recognitionResult.enrichedCigar.drinkPairings,
      imageUrl: recognitionResult.enrichedCigar.imageUrl,
      recognitionConfidence: recognitionResult.confidence,
      msrp: recognitionResult.enrichedCigar.msrp,
      singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
      releaseYear: recognitionResult.enrichedCigar.releaseYear,
      limitedEdition: recognitionResult.enrichedCigar.limitedEdition,
      professionalRating: recognitionResult.enrichedCigar.professionalRating,
      agingPotential: recognitionResult.enrichedCigar.agingPotential,
      wrapperColor: recognitionResult.enrichedCigar.wrapperColor,
      identifyingFeatures: recognitionResult.enrichedCigar.identifyingFeatures,
      overview: recognitionResult.enrichedCigar.overview,
      tobaccoOrigin: recognitionResult.enrichedCigar.tobaccoOrigin,
      flavorTags: recognitionResult.enrichedCigar.flavorTags,
      cigarAficionadoRating: recognitionResult.enrichedCigar.cigarAficionadoRating,
    };

    // Navigate through MainTabs to ensure proper stack context
    navigation.navigate('MainTabs', {
      screen: 'HumidorList',
      params: {
        screen: 'AddToInventory',
        params: {
          cigar,
          singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
          existingItem: duplicateItem,
          mode: 'addMore',
          humidorId,
        },
      },
    });

    setShowDuplicateDialog(false);
    setDuplicateItem(null);
  };

  const handleCreateNewEntry = () => {
    if (!recognitionResult) return;

    const cigar: Cigar = {
      id: Date.now().toString(),
      brand: recognitionResult.enrichedCigar.brand || 'Unknown Brand',
      line: recognitionResult.enrichedCigar.line || 'Unknown Line',
      name: recognitionResult.enrichedCigar.name || 'Unknown Name',
      size: recognitionResult.enrichedCigar.size || 'Unknown Size',
      wrapper: recognitionResult.enrichedCigar.wrapper || 'Unknown',
      filler: recognitionResult.enrichedCigar.filler || 'Unknown',
      binder: recognitionResult.enrichedCigar.binder || 'Unknown',
      tobacco: recognitionResult.enrichedCigar.tobacco,
      strength: recognitionResult.enrichedCigar.strength || 'Medium',
      flavorProfile: recognitionResult.enrichedCigar.flavorTags || [],
      tobaccoOrigins: recognitionResult.enrichedCigar.tobaccoOrigins || [],
      smokingExperience: recognitionResult.enrichedCigar.smokingExperience || {
        first: 'Unknown',
        second: 'Unknown',
        final: 'Unknown',
      },
      drinkPairings: recognitionResult.enrichedCigar.drinkPairings,
      imageUrl: recognitionResult.enrichedCigar.imageUrl,
      recognitionConfidence: recognitionResult.confidence,
      msrp: recognitionResult.enrichedCigar.msrp,
      singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
      releaseYear: recognitionResult.enrichedCigar.releaseYear,
      limitedEdition: recognitionResult.enrichedCigar.limitedEdition,
      professionalRating: recognitionResult.enrichedCigar.professionalRating,
      agingPotential: recognitionResult.enrichedCigar.agingPotential,
      wrapperColor: recognitionResult.enrichedCigar.wrapperColor,
      identifyingFeatures: recognitionResult.enrichedCigar.identifyingFeatures,
      overview: recognitionResult.enrichedCigar.overview,
      tobaccoOrigin: recognitionResult.enrichedCigar.tobaccoOrigin,
      flavorTags: recognitionResult.enrichedCigar.flavorTags,
      cigarAficionadoRating: recognitionResult.enrichedCigar.cigarAficionadoRating,
    };

    // Navigate through MainTabs to ensure proper stack context
    navigation.navigate('MainTabs', {
      screen: 'HumidorList',
      params: {
        screen: 'AddToInventory',
        params: {
          cigar,
          singleStickPrice: recognitionResult.enrichedCigar.singleStickPrice,
          humidorId,
        },
      },
    });

    setShowDuplicateDialog(false);
    setDuplicateItem(null);
  };

  // Don't show loading screen as a replacement, we'll show it as a modal overlay

  return (
    <View style={styles.container}>
      {/* Search Button */}
      <View style={styles.settingsHeader}>
        <TouchableOpacity style={styles.searchButton} onPress={() => setShowSimpleSearch(true)}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {!imageUri && !isProcessing && !recognitionResult ? (
        // Camera View
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={type}
            ref={handleCameraRef}
            onCameraReady={handleCameraReady}
            onMountError={handleCameraMountError}
          />

          {/* Visual Guide Overlay */}
          <View style={styles.cameraOverlay} pointerEvents="none">
            {/* Instruction text at the top */}
            <View style={styles.instructionArea}>
              <Text style={styles.guideText}>Hold cigar horizontally with band visible</Text>
            </View>

            {/* Top grayed out area */}
            <View style={styles.overlayTop} />

            {/* Clear horizontal band for cigar */}
            <View style={styles.cigarGuideArea}>
              {/* Corner brackets */}
              <View style={styles.guideBrackets}>
                <View style={styles.bracketTopLeft} />
                <View style={styles.bracketTopRight} />
                <View style={styles.bracketBottomLeft} />
                <View style={styles.bracketBottomRight} />
              </View>
            </View>

            {/* Bottom grayed out area */}
            <View style={styles.overlayBottom} />
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.controlButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#CCCCCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                (!isCameraReady || isCapturing) && styles.captureButtonDisabled,
              ]}
              onPress={takePicture}
              disabled={!isCameraReady || isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#7C2D12" />
              ) : (
              <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setType(type === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse" size={24} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Results View
        <ScrollView
          style={[
            styles.resultsContainer,
            Platform.OS === 'web' && styles.resultsContainerWeb,
          ]}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
          overScrollMode="always"
        >
          <View style={styles.imagePreview}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <Image
                source={require('../../assets/cigar-placeholder.jpg')}
                style={styles.previewImage}
              />
            )}
            <TouchableOpacity style={styles.retakeButton} onPress={resetRecognition}>
              <Ionicons name="camera" size={20} color="#CCCCCC" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#7C2D12" />
              <Text style={styles.processingText}>
                {processingMessages[currentProcessingMessage]}
              </Text>
            </View>
          ) : recognitionResult ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.titleWithEdit}>
                  <Text style={styles.sectionTitle}>{recognitionResult.enrichedCigar.brand}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setEditBrand(recognitionResult.enrichedCigar.brand || '');
                      setEditName(recognitionResult.enrichedCigar.name || '');
                      setShowEditModal(true);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color="#DC851F" />
                  </TouchableOpacity>
                </View>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{recognitionResult.confidence}%</Text>
                </View>
              </View>

              <View style={styles.nameWithEdit}>
                <Text style={styles.resultSubtitle}>
                  {recognitionResult.enrichedCigar.name &&
                  recognitionResult.enrichedCigar.name !== 'Unknown Name'
                    ? recognitionResult.enrichedCigar.name
                    : recognitionResult.enrichedCigar.line}
                </Text>
              </View>

              {/* Cigar Description */}
              {recognitionResult.enrichedCigar.overview && (
                <Text style={styles.cigarDescription}>
                  {recognitionResult.enrichedCigar.overview}
                </Text>
              )}

              {((recognitionResult.enrichedCigar.flavorTags &&
                recognitionResult.enrichedCigar.flavorTags.length > 0) ||
                (recognitionResult.enrichedCigar.flavorProfile &&
                  recognitionResult.enrichedCigar.flavorProfile.length > 0)) && (
                <View style={styles.flavorSection}>
                  <Text style={styles.sectionTitle}>Flavor Profile</Text>
                  <View style={styles.flavorTags}>
                    {(
                      recognitionResult.enrichedCigar.flavorTags ||
                      recognitionResult.enrichedCigar.flavorProfile ||
                      []
                    ).map((flavor, index) => (
                      <View key={index} style={styles.flavorTag}>
                        <Text style={styles.flavorText}>{flavor}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Strength Section */}
              {recognitionResult.enrichedCigar.strength && (
                <View style={styles.strengthSection}>
                  <Text style={styles.sectionTitle}>Strength</Text>
                  <View style={styles.flavorTags}>
                    <View
                      style={[
                        styles.flavorTag,
                        {
                          backgroundColor: getStrengthInfo(recognitionResult.enrichedCigar.strength)
                            .color,
                        },
                      ]}
                    >
                      <Text style={styles.flavorText}>
                        {getStrengthInfo(recognitionResult.enrichedCigar.strength).label}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Drink Pairings Section */}
              {recognitionResult.enrichedCigar.drinkPairings &&
              (recognitionResult.enrichedCigar.drinkPairings.alcoholic?.length > 0 ||
                recognitionResult.enrichedCigar.drinkPairings.nonAlcoholic?.length > 0) ? (
                <View style={styles.drinkPairingsSection}>
                  <Text style={styles.sectionTitle}>Drink Pairings</Text>

                  {recognitionResult.enrichedCigar.drinkPairings.alcoholic &&
                    recognitionResult.enrichedCigar.drinkPairings.alcoholic.length > 0 && (
                      <View style={styles.pairingCategory}>
                        <Text style={styles.pairingCategoryTitle}>Alcoholic</Text>
                        <View style={styles.flavorTags}>
                          {recognitionResult.enrichedCigar.drinkPairings.alcoholic.map(
                            (drink, index) => (
                              <View key={`alc-${index}`} style={styles.pairingTag}>
                                <Ionicons name="wine" size={14} color="#DC851F" />
                                <Text style={styles.pairingText}>{drink}</Text>
                              </View>
                            ),
                          )}
                        </View>
                      </View>
                    )}

                  {recognitionResult.enrichedCigar.drinkPairings.nonAlcoholic &&
                    recognitionResult.enrichedCigar.drinkPairings.nonAlcoholic.length > 0 && (
                      <View style={styles.pairingCategory}>
                        <Text style={styles.pairingCategoryTitle}>Non-Alcoholic</Text>
                        <View style={styles.flavorTags}>
                          {recognitionResult.enrichedCigar.drinkPairings.nonAlcoholic.map(
                            (drink, index) => (
                              <View key={`non-${index}`} style={styles.pairingTag}>
                                <Ionicons name="cafe" size={14} color="#DC851F" />
                                <Text style={styles.pairingText}>{drink}</Text>
                              </View>
                            ),
                          )}
                        </View>
                      </View>
                    )}
                </View>
              ) : null}

              {/* Tobacco Section */}
              {(recognitionResult.enrichedCigar.tobacco ||
                recognitionResult.enrichedCigar.wrapper) && (
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.sectionTitle}>Tobacco</Text>
                    <Text style={styles.detailValue}>
                      {recognitionResult.enrichedCigar.tobacco ||
                        recognitionResult.enrichedCigar.wrapper}
                    </Text>
                  </View>
                </View>
              )}

              {/* Box Pricing */}
              {recognitionResult.enrichedCigar.msrp &&
                recognitionResult.enrichedCigar.msrp.trim() !== '' && (
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.sectionTitle}>Box Price</Text>
                      <Text style={styles.detailValue}>
                        {recognitionResult.enrichedCigar.msrp.split('\n').map((line, index) => (
                          <Text key={index}>
                            {line.trim()}
                            {index < recognitionResult.enrichedCigar.msrp.split('\n').length - 1 &&
                              '\n'}
                          </Text>
                        ))}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Stick Pricing */}
              {recognitionResult.enrichedCigar.singleStickPrice &&
                recognitionResult.enrichedCigar.singleStickPrice.trim() !== '' && (
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.sectionTitle}>Per Stick</Text>
                      <Text style={styles.detailValue}>
                        {recognitionResult.enrichedCigar.singleStickPrice
                          .split('\n')
                          .map((line, index) => (
                            <Text key={index}>
                              {line.trim()}
                              {index <
                                recognitionResult.enrichedCigar.singleStickPrice.split('\n')
                                  .length -
                                  1 && '\n'}
                            </Text>
                          ))}
                      </Text>
                    </View>
                  </View>
                )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.addButton, isAddingToHumidor && styles.addButtonDisabled]}
                  onPress={addToInventory}
                  disabled={isAddingToHumidor}
                  activeOpacity={isAddingToHumidor ? 1 : 0.7}
                >
                  {isAddingToHumidor ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={styles.addButtonSpinner} />
                  ) : (
                    <Ionicons name="add" size={20} color="#FFFFFF" style={styles.addButtonIcon} />
                  )}
                  <Text style={styles.addButtonText}>
                    {isAddingToHumidor ? 'Saving...' : 'Add to Humidor'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smokeButton} onPress={startJournaling}>
                  <Ionicons name="create" size={20} color="#DC851F" />
                  <Text style={styles.smokeButtonText}>Let's Journal!</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modeIndicator}>
                <Text style={styles.modeText}></Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Custom Entry Modal */}
      <Modal visible={showManualEntry} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowManualEntry(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Custom Entry</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.textInput}
                value={manualBrand}
                onChangeText={setManualBrand}
                placeholder="e.g., Padron, Arturo Fuente"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Line/Series</Text>
              <TextInput
                style={styles.textInput}
                value={manualLine}
                onChangeText={setManualLine}
                placeholder="e.g., 1964, Hemingway"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Size/Vitola</Text>
              <TextInput
                style={styles.textInput}
                value={manualSize}
                onChangeText={setManualSize}
                placeholder="e.g., Robusto, 6x50"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={manualDescription}
                onChangeText={setManualDescription}
                placeholderTextColor="#999999"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowManualEntry(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitModalButton} onPress={handleManualSubmit}>
              <Text style={styles.submitModalButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Simple Search Modal */}
      <Modal visible={showSimpleSearch} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSimpleSearch(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Cigar</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.searchSubtitle}>Search by brand and cigar name</Text>

            <TextInput
              style={styles.searchTextInput}
              value={searchDescription}
              onChangeText={setSearchDescription}
              placeholder="Cohiba Behike 52, Arturo Fuente Opus X"
              placeholderTextColor="#999999"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              blurOnSubmit={true}
              returnKeyType="done"
            />

            {/* Submit Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowSimpleSearch(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalButton} onPress={processSimpleSearch}>
                <Text style={styles.submitModalButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Detection Dialog */}
      <Modal
        visible={showDuplicateDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDuplicateDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateDialog}>
            <View style={styles.duplicateHeader}>
              <Ionicons name="warning" size={32} color="#DC851F" />
              <Text style={styles.duplicateTitle}>Cigar Already in Humidor</Text>
            </View>

            <Text style={styles.duplicateMessage}>
              {duplicateItem && getCigarDisplayName(duplicateItem.cigar)} is already in your humidor
              with {duplicateItem?.quantity} cigars.
            </Text>

            <Text style={styles.duplicateSubtext}>
              Would you like to add more to this existing entry or create a separate entry?
            </Text>

            <View style={styles.duplicateButtons}>
              <TouchableOpacity
                style={[styles.duplicateButton, styles.addToExistingButton]}
                onPress={handleAddToExisting}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addToExistingButtonText}>Add to Existing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.duplicateButton, styles.createNewButton]}
                onPress={handleCreateNewEntry}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createNewButtonText}>Create New Entry</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDuplicateDialog(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Humidor Selection Modal */}
      <Modal
        visible={showHumidorSelection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHumidorSelection(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Humidor</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowHumidorSelection(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Choose which humidor to add this cigar to</Text>

          <ScrollView style={styles.humidorList}>
            {availableHumidors.map((humidor) => (
              <TouchableOpacity
                key={humidor.id}
                style={styles.humidorOption}
                onPress={() => handleHumidorSelection(humidor.id)}
              >
                <View style={styles.humidorOptionContent}>
                  <Text style={styles.humidorOptionName}>{humidor.name}</Text>
                  {humidor.description && (
                    <Text style={styles.humidorOptionDescription}>{humidor.description}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Loading Humidors Modal */}
      <Modal
        visible={showLoadingHumidors}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLoadingHumidors(false)}
      >
        <View style={styles.loadingModalContainer}>
          <LoadingHumidorsScreen message="Loading your humidors..." />
        </View>
      </Modal>

      {/* Edit Brand/Name Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Cigar Details</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.textInput}
                value={editBrand}
                onChangeText={setEditBrand}
                placeholder="e.g., Padron, Arturo Fuente"
                placeholderTextColor="#999999"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g., 1964 Anniversary, Hemingway"
                placeholderTextColor="#999999"
                autoCapitalize="words"
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitModalButton}
              onPress={() => {
                if (recognitionResult) {
                  // Update the recognition result with edited values
                  setRecognitionResult({
                    ...recognitionResult,
                    enrichedCigar: {
                      ...recognitionResult.enrichedCigar,
                      brand: editBrand.trim() || recognitionResult.enrichedCigar.brand,
                      name: editName.trim() || recognitionResult.enrichedCigar.name,
                    },
                  });
                }
                setShowEditModal(false);
              }}
            >
              <Text style={styles.submitModalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    height: '100%',
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  errorContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 12,
    margin: 20,
  },
  loadingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tobaccoBackgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  errorTitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 36,
  },
  searchButtonText: {
    color: '#DC851F',
    fontSize: 14,
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 16,
  },
  separator: {
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 0,
  },
  manualEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 36,
    marginLeft: 8,
  },
  manualEntryLinkText: {
    color: '#DC851F',
    fontSize: 14,
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 16,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
  },
  instructionArea: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  overlayTop: {
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    minHeight: 200,
  },
  cigarGuideArea: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  guideBrackets: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bracketTopLeft: {
    position: 'absolute',
    top: 20,
    left: 40,
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#DC851F',
  },
  bracketTopRight: {
    position: 'absolute',
    top: 20,
    right: 40,
    width: 30,
    height: 30,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: '#DC851F',
  },
  bracketBottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#DC851F',
  },
  bracketBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    width: 30,
    height: 30,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#DC851F',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DC851F',
  },
  resultsContainer: {
    flex: 1,
    minHeight: 0,
    height: '100%',
  },
  resultsContainerWeb: {
    overflowY: 'scroll',
    WebkitOverflowScrolling: 'touch',
  } as any,
  resultsContent: {
    flexGrow: 1,
    paddingBottom: 200,
    paddingHorizontal: 4,
  },
  imagePreview: {
    position: 'relative',
    margin: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  retakeText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 6,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  resultCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  nameWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#DC851F',
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultSubtitle: {
    color: '#FFA737',
    fontSize: 12,
    marginBottom: 8,
  },
  cigarDescription: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'left',
    marginBottom: 16,
    paddingHorizontal: 0,
    lineHeight: 16,
  },
  flavorSection: {
    marginBottom: 24,
  },
  strengthSection: {
    marginBottom: 24,
  },
  drinkPairingsSection: {
    marginBottom: 24,
  },
  pairingCategory: {
    marginBottom: 12,
  },
  pairingCategoryTitle: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  pairingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#DC851F',
    gap: 6,
  },
  pairingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFA737',
  },
  flavorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '100%',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '400',
  },
  detailValue: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#DC851F',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonSpinner: {
    marginRight: 8,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  smokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DC851F',
  },
  smokeButtonText: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modeIndicator: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modeText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  manualButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#7C2D12',
    minWidth: 200,
    marginBottom: 16,
  },
  manualButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#555555',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
  },
  headerSpacer: {
    width: 40,
  },
  searchButton: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '500',
  },
  searchButtonDisabled: {
    color: '#666',
  },
  searchButtonHeader: {
    color: '#7C2D12',
    fontSize: 16,
    fontWeight: '600',
  },
  searchSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'left',
    marginBottom: 16,
    lineHeight: 16,
    fontWeight: '400',
  },
  searchTextInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 12,
    color: '#999999',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#555555',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#CCCCCC',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#555555',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  cancelModalButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  submitModalButton: {
    flex: 1,
    backgroundColor: '#DC851F',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    backgroundColor: '#333333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  // Duplicate Dialog Styles
  duplicateDialog: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333',
    maxWidth: 400,
    alignSelf: 'center',
  },
  duplicateHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  duplicateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  duplicateMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  duplicateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  duplicateButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  duplicateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addToExistingButton: {
    backgroundColor: '#DC851F',
  },
  addToExistingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createNewButton: {
    backgroundColor: '#DC851F',
  },
  createNewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
  // Humidor Selection Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  humidorList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  humidorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  humidorOptionContent: {
    flex: 1,
  },
  humidorOptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  humidorOptionDescription: {
    fontSize: 14,
    color: '#999',
  },
});
