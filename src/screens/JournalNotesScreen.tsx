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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, JournalEntry } from '../types';
import { StorageService } from '../storage/storageService';
import * as Location from 'expo-location';

type JournalNotesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JournalNotes'>;
type JournalNotesScreenRouteProp = RouteProp<RootStackParamList, 'JournalNotes'>;

export default function JournalNotesScreen() {
  const navigation = useNavigation<JournalNotesScreenNavigationProp>();
  const route = useRoute<JournalNotesScreenRouteProp>();
  const { cigar, rating, selectedFlavors, initialNotes, location: passedLocation, photos: initialPhotos = [] } = route.params;

  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);

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
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  useEffect(() => {
    if (passedLocation) {
      const locationString = [passedLocation.city, passedLocation.state, passedLocation.country].filter(Boolean).join(', ');
      setLocation(locationString);
    } else {
      getCurrentLocation();
    }
  }, [passedLocation]);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to record where you enjoyed this cigar.',
          [{ text: 'OK' }]
        );
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const { city, region, country } = reverseGeocode[0];
        const locationString = [city, region, country].filter(Boolean).join(', ');
        setLocation(locationString);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not determine your location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const journalEntry: JournalEntry = {
        id: Date.now().toString(),
        cigar,
        date: new Date(),
        rating: {
          overall: rating,
        },
        selectedFlavors,
        notes: notes.trim() ? 
          (initialNotes ? `${initialNotes}\n\n${notes.trim()}` : notes.trim()) : 
          (initialNotes || ''),
        location: location ? {
          city: location.split(',')[0] || location,
          state: location.split(',')[1]?.trim(),
          country: location.split(',')[2]?.trim(),
        } : passedLocation,
        photos: photos.length > 0 ? photos : undefined,
      };

      await StorageService.saveJournalEntry(journalEntry);
      
      // Navigate to journal page with highlighting
      navigation.navigate('MainTabs', { 
        screen: 'Journal', 
        params: { highlightItemId: journalEntry.id } 
      });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Mild': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Full': return '#F44336';
      default: return '#666';
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.cigarInfo}>
          <Text style={styles.cigarBrand}>{cigar.brand}</Text>
          <Text style={styles.cigarLine}>{cigar.line}</Text>
          <Text style={styles.cigarName}>{cigar.name}</Text>
          
          <View style={styles.ratingInfo}>
            <Text style={styles.ratingLabel}>Your Rating:</Text>
            <Text style={styles.ratingValue}>{rating}/10</Text>
          </View>

          {selectedFlavors.length > 0 && (
            <View style={styles.flavorsInfo}>
              <Text style={styles.flavorsLabel}>Selected Flavors:</Text>
              <View style={styles.flavorsContainer}>
                {selectedFlavors.map((flavor, index) => (
                  <View key={index} style={styles.flavorChip}>
                    <Text style={styles.flavorChipText}>{flavor}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {initialNotes && (
          <View style={styles.initialNotesSection}>
            <Text style={styles.sectionTitle}>Initial Thoughts</Text>
            <Text style={styles.initialNotesText}>{initialNotes}</Text>
          </View>
        )}


        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Final Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Share your thoughts about this cigar... What did you enjoy? Any memorable moments? How was the construction, draw, and overall experience?"
            placeholderTextColor="#999999"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.deletePhotoButton}
                  onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={16} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={takePicture}
            >
              <Ionicons name="camera" size={48} color="#DC851F" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.submitButtonText}>Save Journal Entry</Text>
        </TouchableOpacity>
      </ScrollView>
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
  cigarInfo: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cigarBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  cigarLine: {
    fontSize: 12,
    color: '#FFA737',
    marginBottom: 4,
  },
  cigarName: {
    fontSize: 12,
    color: '#999999',
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#999999',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFA737',
  },
  flavorsInfo: {
    marginTop: 12,
  },
  flavorsLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 8,
  },
  flavorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flavorChip: {
    backgroundColor: '#FFA737',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  flavorChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  locationSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  locationSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 16,
  },
  locationButton: {
    padding: 4,
  },
  initialNotesSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  initialNotesText: {
    color: '#999999',
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  notesSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  notesInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#999999',
    fontSize: 12,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 20,
    marginBottom: 300,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  photoSection: {
    marginBottom: 24,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  addPhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
