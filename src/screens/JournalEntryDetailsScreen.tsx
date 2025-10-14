import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, JournalEntry } from '../types';
import { StorageService } from '../storage/storageService';
import { getStrengthInfo } from '../utils/strengthUtils';

type JournalEntryDetailsScreenRouteProp = RouteProp<RootStackParamList, 'JournalEntryDetails'>;

const FLAVOR_TAGS = [
  'Woody', 'Earthy', 'Spicy', 'Sweet', 'Creamy', 'Nutty', 'Chocolate', 'Coffee',
  'Leather', 'Cedar', 'Pepper', 'Vanilla', 'Caramel', 'Honey', 'Fruity', 'Citrus',
  'Floral', 'Herbal', 'Smoky', 'Toasty', 'Rich', 'Smooth', 'Bold', 'Complex',
  'Balanced', 'Elegant', 'Robust', 'Refined', 'Intense', 'Subtle'
];

export default function JournalEntryDetailsScreen({ route }: { route: JournalEntryDetailsScreenRouteProp }) {
  const { entry: initialEntry } = route.params;
  const [entry, setEntry] = useState(initialEntry);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(entry.notes || '');
  const [editedFlavors, setEditedFlavors] = useState(entry.selectedFlavors || []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getStrengthColor = (strength: string) => {
    const strengthInfo = getStrengthInfo(strength);
    return strengthInfo.color;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedNotes(entry.notes || '');
    setEditedFlavors(entry.selectedFlavors || []);
  };

  const handleSave = async () => {
    try {
      const updatedEntry = {
        ...entry,
        notes: editedNotes,
        selectedFlavors: editedFlavors,
      };
      
      await StorageService.saveJournalEntry(updatedEntry);
      setEntry(updatedEntry);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPhotos = entry.photos?.filter((_, index) => index !== photoIndex) || [];
              const updatedEntry = {
                ...entry,
                photos: updatedPhotos,
              };
              
              await StorageService.saveJournalEntry(updatedEntry);
              setEntry(updatedEntry);
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleFlavorToggle = (flavor: string) => {
    setEditedFlavors(prev => 
      prev.includes(flavor) 
        ? prev.filter(f => f !== flavor)
        : [...prev, flavor]
    );
  };

  const renderFlavorChips = (flavors: string[]) => {
    if (isEditing) {
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
                  editedFlavors.includes(flavor) && styles.flavorTagSelected
                ]}
                onPress={() => handleFlavorToggle(flavor)}
              >
                <Text style={[
                  styles.flavorTagText,
                  editedFlavors.includes(flavor) && styles.flavorTagTextSelected
                ]}>
                  {flavor}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    
    if (flavors.length === 0) return null;
    
    return (
      <View style={styles.flavorsContainer}>
        {flavors.map((flavor, index) => (
          <View key={index} style={styles.flavorChip}>
            <Text style={styles.flavorChipText}>{flavor}</Text>
          </View>
        ))}
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
        {/* Cigar Information */}
        <View style={styles.cigarInfo}>
          <Text style={styles.cigarBrand}>{entry.cigar.brand}</Text>
          <Text style={styles.cigarLine}>{entry.cigar.line}</Text>
          {entry.cigar.name && entry.cigar.name !== 'Unknown Name' && (
            <Text style={styles.cigarName}>{entry.cigar.name}</Text>
          )}
          <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
          {entry.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.locationText}>
                {[entry.location.city, entry.location.state, entry.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Flavor Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flavor Profile</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                <Ionicons name="pencil-outline" size={16} color="#DC851F" />
              </TouchableOpacity>
            )}
          </View>
          {renderFlavorChips(entry.selectedFlavors)}
          
          {/* Rating and Strength */}
          <View style={styles.ratingStrengthRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <Text style={styles.ratingValue}>{entry.rating.overall}/10</Text>
            </View>
            
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>Strength</Text>
            <View style={[styles.strengthPill, { backgroundColor: getStrengthColor(entry.cigar.strength) }]}>
              <Text style={styles.strengthText}>{getStrengthInfo(entry.cigar.strength).label}</Text>
            </View>
            </View>
          </View>
        </View>

        {/* Cigar Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cigar Details</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wrapper</Text>
              <Text style={styles.detailValue}>{entry.cigar.wrapper}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Filler</Text>
              <Text style={styles.detailValue}>{entry.cigar.filler}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Binder</Text>
              <Text style={styles.detailValue}>{entry.cigar.binder}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tobacco</Text>
              <Text style={styles.detailValue}>{entry.cigar.tobacco}</Text>
            </View>
          </View>
        </View>


        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                <Ionicons name="pencil-outline" size={16} color="#DC851F" />
              </TouchableOpacity>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Add your notes about this cigar..."
              placeholderTextColor="#999999"
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.notesText}>{entry.notes || 'No notes added'}</Text>
          )}
        </View>

        {/* Photos Section */}
        {entry.photos && entry.photos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
            </View>
            <View style={styles.photosContainer}>
              {entry.photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(photo)}
                    style={styles.photoTouchable}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Full Screen Image Modal */}
        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.imageModalBackground}
              onPress={() => setSelectedImage(null)}
            >
              <View style={styles.imageModalContent}>
                <TouchableOpacity
                  style={styles.closeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Edit Controls */}
        {isEditing && (
          <View style={styles.editControls}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding for better scrolling */}
        <View style={styles.bottomPadding} />
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
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  ratingStrengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontWeight: '400',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFA737',
  },
  strengthContainer: {
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontWeight: '400',
  },
  strengthPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  strengthText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 0,
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
  flavorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  detailsList: {
    gap: 16,
  },
  detailItem: {
    width: '100%',
  },
  detailLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 12,
    color: '#999999',
  },
  notesText: {
    color: '#999999',
    fontSize: 12,
    lineHeight: 16,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoTouchable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 2,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  dateText: {
    color: '#999999',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    color: '#999999',
    fontSize: 12,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#333333',
  },
  notesInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#999999',
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  flavorChipSelected: {
    backgroundColor: '#7C2D12',
  },
  flavorChipTextSelected: {
    color: 'white',
  },
  flavorSection: {
    marginBottom: 0,
  },
  flavorLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 4,
    fontWeight: '600',
  },
  flavorSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  flavorCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#666666', // Gray for unselected
    borderWidth: 1,
    borderColor: '#555555',
  },
  flavorTagSelected: {
    backgroundColor: '#FFA737', // Yellow for selected
    borderColor: '#DC851F',
  },
  flavorTagText: {
    fontSize: 12,
    color: '#FFFFFF', // White text for both states
    fontWeight: '500',
  },
  flavorTagTextSelected: {
    color: '#FFFFFF',
  },
  editControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
    marginTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DC851F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});