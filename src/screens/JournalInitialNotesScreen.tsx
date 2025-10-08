import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ImageBackground,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type JournalInitialNotesScreenNavigationProp = any;
type JournalInitialNotesScreenRouteProp = RouteProp<RootStackParamList, 'JournalInitialNotes'>;

export default function JournalInitialNotesScreen() {
  const navigation = useNavigation<JournalInitialNotesScreenNavigationProp>();
  const route = useRoute<JournalInitialNotesScreenRouteProp>();
  const { cigar } = route.params;
  
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);


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

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    navigation.navigate('JournalRating', { 
      cigar, 
      initialNotes: notes.trim() || '',
      photos: photos
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground 
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.fullScreenBackground}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cigarInfo}>
            <View style={styles.cigarHeader}>
              {cigar.imageUrl ? (
                <Image source={{ uri: cigar.imageUrl }} style={styles.cigarImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={24} color="#999" />
                </View>
              )}
              <View style={styles.cigarTextInfo}>
                <Text style={styles.cigarBrand}>{cigar.brand}</Text>
                <Text style={styles.cigarLine}>{cigar.line}</Text>
                <Text style={styles.cigarName}>{cigar.name}</Text>
              </View>
            </View>
          </View>


          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Initial Thoughts</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What are your initial thoughts about this cigar? What are you expecting from this smoking experience?"
              placeholderTextColor="#999999"
              multiline
              textAlignVertical="top"
              blurOnSubmit={true}
              returnKeyType="done"
              editable={true}
              selectTextOnFocus={true}
            />
          </View>

          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.notesSubtitle}>
              Capture moments from your smoking experience
            </Text>
            
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
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
            <Text style={styles.continueButtonText}>Continue to Rating</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </TouchableWithoutFeedback>
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
  cigarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cigarImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cigarTextInfo: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
  },
  notesSection: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  notesSubtitle: {
    color: '#999999',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 8,
    padding: 12,
    color: '#999999',
    fontSize: 12,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  photosSection: {
    margin: 20,
    marginTop: 0,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoItem: {
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addPhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    backgroundColor: '#DC851F',
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
