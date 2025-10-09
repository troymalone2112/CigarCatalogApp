import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type JournalRatingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JournalRating'>;
type JournalRatingScreenRouteProp = RouteProp<RootStackParamList, 'JournalRating'>;

const FLAVOR_TAGS = [
  'Woody', 'Earthy', 'Spicy', 'Sweet', 'Creamy', 'Nutty', 'Chocolate', 'Coffee',
  'Leather', 'Cedar', 'Pepper', 'Vanilla', 'Caramel', 'Honey', 'Fruity', 'Citrus',
  'Floral', 'Herbal', 'Smoky', 'Toasty', 'Rich', 'Smooth', 'Bold', 'Complex',
  'Balanced', 'Elegant', 'Robust', 'Refined', 'Intense', 'Subtle'
];

export default function JournalRatingScreen() {
  const navigation = useNavigation<JournalRatingScreenNavigationProp>();
  const route = useRoute<JournalRatingScreenRouteProp>();
  const { cigar, initialNotes, location, photos: initialPhotos = [] } = route.params;

  const [rating, setRating] = useState(5);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
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

  const handleFlavorToggle = (flavor: string) => {
    setSelectedFlavors(prev => 
      prev.includes(flavor) 
        ? prev.filter(f => f !== flavor)
        : [...prev, flavor]
    );
  };

  const handleContinue = () => {
    navigation.navigate('JournalNotes', { 
      cigar, 
      rating, 
      selectedFlavors,
      initialNotes,
      location,
      photos: photos
    });
  };

  const renderRatingButtons = () => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Rate this cigar (1-10)</Text>
        <View style={styles.ratingButtons}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.ratingButton,
                rating === num && styles.ratingButtonSelected
              ]}
              onPress={() => setRating(num)}
            >
              <Text style={[
                styles.ratingButtonText,
                rating === num && styles.ratingButtonTextSelected
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingDescription}>
          {rating <= 3 ? 'Poor' : 
           rating <= 5 ? 'Fair' : 
           rating <= 7 ? 'Good' : 
           rating <= 9 ? 'Excellent' : 'Outstanding'}
        </Text>
      </View>
    );
  };

  const renderFlavorCloud = () => {
    return (
      <View style={styles.flavorSection}>
        <Text style={styles.flavorLabel}>Select flavors you experienced</Text>
        <Text style={styles.flavorSubtext}>Tap to select/deselect</Text>
        <View style={styles.flavorCloud}>
          {FLAVOR_TAGS.map((flavor) => (
            <TouchableOpacity
              key={flavor}
              style={[
                styles.flavorTag,
                selectedFlavors.includes(flavor) && styles.flavorTagSelected
              ]}
              onPress={() => handleFlavorToggle(flavor)}
            >
              <Text style={[
                styles.flavorTagText,
                selectedFlavors.includes(flavor) && styles.flavorTagTextSelected
              ]}>
                {flavor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
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
        </View>

        {renderRatingButtons()}
        {renderFlavorCloud()}

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
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Notes</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
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
  ratingContainer: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ratingButtonSelected: {
    backgroundColor: '#FFA737',
    borderColor: '#DC851F',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
  },
  ratingButtonTextSelected: {
    color: '#FFFFFF',
  },
  ratingDescription: {
    fontSize: 12,
    color: '#FFA737',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '400',
  },
  flavorSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  flavorLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  flavorSubtext: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 16,
  },
  flavorCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
  },
  flavorTagSelected: {
    backgroundColor: '#FFA737',
    borderColor: '#DC851F',
  },
  flavorTagText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  flavorTagTextSelected: {
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 20,
    gap: 8,
  },
  continueButtonText: {
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
    paddingLeft: 4, // Add padding to move photos away from left edge
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
