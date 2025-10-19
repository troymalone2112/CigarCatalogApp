import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ImageBackground,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, JournalEntry, Cigar } from '../types';
import { StorageService } from '../storage/storageService';
import { getStrengthInfo } from '../utils/strengthUtils';
import { useJournalDraft } from '../contexts/JournalDraftContext';

type NewJournalEntryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NewJournalEntry'>;
type NewJournalEntryScreenRouteProp = RouteProp<RootStackParamList, 'NewJournalEntry'>;

const FLAVOR_TAGS = [
  'Woody', 'Earthy', 'Spicy', 'Sweet', 'Creamy', 'Nutty', 'Chocolate', 'Coffee',
  'Leather', 'Cedar', 'Pepper', 'Vanilla', 'Caramel', 'Honey', 'Fruity', 'Citrus',
  'Floral', 'Herbal', 'Smoky', 'Toasty', 'Rich', 'Smooth', 'Bold', 'Complex',
  'Balanced', 'Elegant', 'Robust', 'Refined', 'Intense', 'Subtle'
];

export default function NewJournalEntryScreen() {
  const navigation = useNavigation<NewJournalEntryScreenNavigationProp>();
  const route = useRoute<NewJournalEntryScreenRouteProp>();
  const { cigar, recognitionImageUrl } = route.params;
  const { currentDraft, saveDraft, loadDraft, clearDraft, isDraftActive, hasUnsavedChanges } = useJournalDraft();

  // Form state
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoadingDraft(true);
      
      // Try to load existing draft for this cigar
      const existingDraft = await loadDraft(cigar.id);
      
      if (existingDraft) {
        console.log('📝 Restoring draft for cigar:', cigar.brand, cigar.line);
        setNotes(existingDraft.notes);
        setRating(existingDraft.rating);
        setSelectedFlavors(existingDraft.selectedFlavors);
        setPhotos(existingDraft.photos);
        setLocation(existingDraft.location);
        
        // Show restoration message
        Alert.alert(
          'Draft Restored',
          'We found your previous journal entry for this cigar. Your progress has been restored.',
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        console.log('📝 No existing draft found, starting fresh');
        getCurrentLocation();
      }
    } catch (error) {
      console.error('❌ Error initializing screen:', error);
      getCurrentLocation();
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const locationString = [address.city, address.region, address.country].filter(Boolean).join(', ');
        setLocation(locationString);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...photos, result.assets[0].uri];
        setPhotos(newPhotos);
        saveDraft({ photos: newPhotos });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    saveDraft({ photos: newPhotos });
  };

  const toggleFlavor = (flavor: string) => {
    const newFlavors = selectedFlavors.includes(flavor) 
      ? selectedFlavors.filter(f => f !== flavor)
      : [...selectedFlavors, flavor];
    
    setSelectedFlavors(newFlavors);
    
    // Auto-save draft
    saveDraft({ selectedFlavors: newFlavors });
  };

  // Auto-save functions for form fields
  const handleNotesChange = (text: string) => {
    setNotes(text);
    saveDraft({ notes: text });
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    saveDraft({ rating: newRating });
  };

  const handleLocationChange = (text: string) => {
    setLocation(text);
    saveDraft({ location: text });
  };

  const renderStars = () => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRatingChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={28}
              color="#DC851F"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFlavorTags = () => {
    return (
      <View style={styles.flavorContainer}>
        {FLAVOR_TAGS.map((flavor) => (
          <TouchableOpacity
            key={flavor}
            style={[
              styles.flavorTag,
              selectedFlavors.includes(flavor) && styles.selectedFlavorTag
            ]}
            onPress={() => toggleFlavor(flavor)}
          >
            <Text style={[
              styles.flavorTagText,
              selectedFlavors.includes(flavor) && styles.selectedFlavorTagText
            ]}>
              {flavor}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPhotos = () => {
    if (photos.length === 0) {
      return (
        <TouchableOpacity style={styles.addPhotoButton} onPress={takePicture}>
          <Ionicons name="camera-outline" size={24} color="#DC851F" />
          <Text style={styles.addPhotoText}>Add Photos</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.photosContainer}>
        <View style={styles.photosHeader}>
          <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
          <TouchableOpacity onPress={takePicture} style={styles.addMoreButton}>
            <Ionicons name="add" size={20} color="#DC851F" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Generate a proper UUID v4
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const journalEntry: JournalEntry = {
        id: generateUUID(), // Generate a proper UUID
        date: new Date(), // Use current date
        cigar,
        rating: {
          overall: rating,
        },
        selectedFlavors,
        notes: notes.trim() || '',
        location: location ? {
          city: location.split(',')[0]?.trim() || '',
          state: location.split(',')[1]?.trim() || undefined,
          country: location.split(',')[2]?.trim() || undefined,
        } : undefined,
        imageUrl: recognitionImageUrl, // Store the recognition image as the main image
        photos: photos.length > 0 ? photos : undefined, // Store all photos in the photos array
      };

      await StorageService.saveJournalEntry(journalEntry);
      
      // Clear the draft after successful save
      await clearDraft();
      
      // Navigate back to journal list
      navigation.navigate('MainTabs', { screen: 'Journal' });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => {
              // Draft will be preserved for when they return
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#DC851F" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Journal Entry</Text>
            {isLoadingDraft && (
              <Text style={styles.draftStatus}>Loading draft...</Text>
            )}
            {hasUnsavedChanges && !isLoadingDraft && (
              <Text style={styles.draftStatus}>Draft saved</Text>
            )}
          </View>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cigar Information */}
          <View style={styles.cigarInfoContainer}>
            <View style={styles.cigarHeader}>
              {recognitionImageUrl && (
                <Image source={{ uri: recognitionImageUrl }} style={styles.cigarImage} />
              )}
              <View style={styles.cigarDetails}>
                <Text style={styles.cigarBrand}>{cigar.brand}</Text>
                <Text style={styles.cigarName}>{cigar.line}</Text>
                <View style={[styles.strengthBadge, {
                  backgroundColor: getStrengthInfo(cigar.strength).backgroundColor,
                  borderColor: getStrengthInfo(cigar.strength).borderColor,
                  borderWidth: 1,
                }]}>
                  <Text style={[styles.strengthBadgeText, {
                    color: getStrengthInfo(cigar.strength).color,
                  }]}>
                    {cigar.strength}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Smoking Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smoking Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={handleNotesChange}
              placeholder="Share your thoughts about this cigar... (Optional)"
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <View style={styles.ratingHeader}>
              <Text style={styles.sectionTitle}>Rate this Cigar</Text>
              <Text style={styles.ratingNumber}>{rating}/10</Text>
            </View>
            {renderStars()}
          </View>

          {/* Flavors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flavors</Text>
            <Text style={styles.sectionSubtitle}>Select the flavors you experienced</Text>
            {renderFlavorTags()}
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.sectionSubtitle}>Add photos of your smoking experience</Text>
            {renderPhotos()}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={handleLocationChange}
              placeholder={locationLoading ? "Getting location..." : "Where did you enjoy this cigar?"}
              placeholderTextColor="#666"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
  },
  cancelButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  draftStatus: {
    fontSize: 12,
    color: '#DC851F',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 12,
  },
  cigarInfoContainer: {
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
  },
  cigarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cigarImage: {
    width: 60,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
  },
  cigarDetails: {
    flex: 1,
  },
  cigarBrand: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cigarName: {
    fontSize: 14,
    color: '#FFA737',
    marginBottom: 8,
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  strengthBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 240,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC851F',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 0,
    marginRight: 0,
    flex: 1,
  },
  flavorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
  },
  selectedFlavorTag: {
    backgroundColor: '#DC851F',
    borderColor: '#DC851F',
  },
  flavorTagText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  selectedFlavorTagText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  photosContainer: {
    marginTop: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMoreButton: {
    backgroundColor: 'rgba(220, 133, 31, 0.2)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    color: '#DC851F',
    fontSize: 14,
    marginTop: 8,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    borderRadius: 12,
  },
  locationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
