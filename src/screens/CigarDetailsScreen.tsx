import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList, HumidorStackParamList, InventoryItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getStrengthInfo } from '../utils/strengthUtils';
import StrengthButton from '../components/StrengthButton';
import { StorageService } from '../storage/storageService';
import { OptimizedHumidorService } from '../services/optimizedHumidorService';
import { useAuth } from '../contexts/AuthContext';

type CigarDetailsScreenRouteProp = RouteProp<HumidorStackParamList, 'CigarDetails'>;

interface Props {
  route: CigarDetailsScreenRouteProp;
}

export default function CigarDetailsScreen({ route }: Props) {
  const navigation = useNavigation();
  const { cigar: initialCigar, inventoryItemId } = route.params;
  const { user } = useAuth();
  const [cigar, setCigar] = useState(initialCigar);
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBrand, setEditedBrand] = useState(cigar.brand || '');
  const [editedName, setEditedName] = useState(cigar.name || '');
  const [loading, setLoading] = useState(false);

  // Load inventory item if itemId is provided
  useEffect(() => {
    if (inventoryItemId) {
      loadInventoryItem();
    }
  }, [inventoryItemId]);

  const loadInventoryItem = async () => {
    try {
      const items = await StorageService.getInventoryItems();
      const item = items.find((i) => i.id === inventoryItemId);
      if (item) {
        setInventoryItem(item);
        setCigar(item.cigar);
        setEditedBrand(item.cigar.brand || '');
        setEditedName(item.cigar.name || '');
      }
    } catch (error) {
      console.error('Error loading inventory item:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedBrand(cigar.brand || '');
    setEditedName(cigar.name || '');
  };

  const handleSave = async () => {
    if (!inventoryItem) {
      Alert.alert('Error', 'Cannot save: Inventory item not found');
      return;
    }

    try {
      setLoading(true);
      const updatedItem: InventoryItem = {
        ...inventoryItem,
        cigar: {
          ...inventoryItem.cigar,
          brand: editedBrand.trim() || inventoryItem.cigar.brand,
          name: editedName.trim() || inventoryItem.cigar.name,
        },
      };

      await StorageService.saveInventoryItem(updatedItem);
      
      // Update local state
      setInventoryItem(updatedItem);
      setCigar(updatedItem.cigar);
      setIsEditing(false);
      
      // Clear cache to refresh inventory list
      if (user) {
        OptimizedHumidorService.clearCache(user.id).catch(() => {});
      }
      
      Alert.alert('Success', 'Cigar information updated successfully');
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthBadgeStyle = (strength: string) => {
    const strengthInfo = getStrengthInfo(strength);
    return {
      backgroundColor: strengthInfo.backgroundColor,
      borderColor: strengthInfo.borderColor,
    };
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            {/* Main content area with image on right */}
            <View style={styles.mainContent}>
              <View style={styles.cigarInfo}>
                {/* Cigar Title Section */}
                <View style={styles.titleSection}>
                  <View style={styles.titleContainer}>
                    {isEditing ? (
                      <View style={styles.editFieldsContainer}>
                        <View style={styles.editField}>
                          <Text style={styles.editFieldLabel}>Brand</Text>
                          <TextInput
                            style={styles.editTextInput}
                            value={editedBrand}
                            onChangeText={setEditedBrand}
                            placeholder="Enter brand name"
                            placeholderTextColor="#999999"
                          />
                        </View>
                        <View style={styles.editField}>
                          <Text style={styles.editFieldLabel}>Name</Text>
                          <TextInput
                            style={styles.editTextInput}
                            value={editedName}
                            onChangeText={setEditedName}
                            placeholder="Enter cigar name"
                            placeholderTextColor="#999999"
                          />
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.resultTitle}>{cigar.brand || 'Unknown Brand'}</Text>
                        <Text style={styles.resultSubtitle}>
                          {cigar.name && cigar.name !== 'Unknown Name' 
                            ? cigar.name 
                            : (cigar.line || 'Unknown Cigar') || 'Unknown Cigar'}
                        </Text>
                      </>
                    )}
                  </View>
                  {inventoryItemId && !isEditing && (
                    <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                      <Ionicons name="pencil-outline" size={16} color="#DC851F" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Strength Badge */}
                {cigar.strength && (
                  <View style={styles.flavorTags}>
                    <View
                      style={[
                        styles.flavorTag,
                        { backgroundColor: getStrengthInfo(cigar.strength || 'Medium').color },
                      ]}
                    >
                      <Text style={styles.flavorText}>
                        {getStrengthInfo(cigar.strength || 'Medium')?.label || 'Medium'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.imageContainer}>
                {/* Cigar Image */}
                {cigar.imageUrl && 
                 cigar.imageUrl !== 'placeholder' && 
                 /^https?:\/\//i.test(cigar.imageUrl) ? (
                  <Image source={{ uri: cigar.imageUrl }} style={styles.cigarImage} />
                ) : (
                  <Image
                    source={require('../../assets/cigar-placeholder.jpg')}
                    style={styles.cigarImage}
                  />
                )}
              </View>
            </View>

            {/* Cigar Description */}
            {cigar.overview && <Text style={styles.cigarDescription}>{String(cigar.overview)}</Text>}

            {/* Flavor Profile Section */}
            {((cigar.flavorTags && cigar.flavorTags.length > 0) ||
              (cigar.flavorProfile && cigar.flavorProfile.length > 0)) && (
              <View style={styles.flavorSection}>
                <Text style={styles.sectionTitle}>Flavor Profile</Text>
                <View style={styles.flavorTags}>
                  {(cigar.flavorTags || cigar.flavorProfile || []).map((flavor, index) => (
                    <View key={index} style={styles.flavorTag}>
                      <Text style={styles.flavorText}>{String(flavor || '')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Strength</Text>
                <Text style={styles.detailValue}>{String(cigar.strength || 'Not specified')}</Text>
              </View>
            </View>

            {/* Tobacco Section */}
            {(cigar.tobacco || cigar.wrapper) && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tobacco</Text>
                  <Text style={styles.detailValue}>{String(cigar.tobacco || cigar.wrapper || 'Not specified')}</Text>
                </View>
              </View>
            )}

            {/* Box Pricing */}
            {cigar.msrp && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Box Price</Text>
                  <Text style={styles.detailValue}>
                    {cigar.msrp.split('\n').map((line, index) => (
                      <Text key={index}>
                        {line.trim()}
                        {index < cigar.msrp.split('\n').length - 1 && '\n'}
                      </Text>
                    ))}
                  </Text>
                </View>
              </View>
            )}

            {/* Stick Pricing */}
            {cigar.singleStickPrice && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Per Stick</Text>
                  <Text style={styles.detailValue}>
                    {cigar.singleStickPrice.split('\n').map((line, index) => (
                      <Text key={index}>
                        {line.trim()}
                        {index < cigar.singleStickPrice.split('\n').length - 1 && '\n'}
                      </Text>
                    ))}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Details */}
            {cigar.releaseYear && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Release Year</Text>
                  <Text style={styles.detailValue}>{String(cigar.releaseYear || 'Not specified')}</Text>
                </View>
              </View>
            )}

            {cigar.cigarAficionadoRating && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cigar Aficionado Rating</Text>
                  <Text style={styles.detailValue}>{String(cigar.cigarAficionadoRating || 0)}/100</Text>
                </View>
              </View>
            )}

            {cigar.agingPotential && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Aging Potential</Text>
                  <Text style={styles.detailValue}>{String(cigar.agingPotential || 'Not specified')}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Edit Controls */}
          {isEditing && inventoryItemId && (
            <View style={styles.editControls}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cigarImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cigarInfo: {
    flex: 1,
    marginRight: 12,
  },
  imageContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'left',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#FFA737',
    textAlign: 'left',
    marginBottom: 8,
  },
  strengthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cigarDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'left',
    marginBottom: 16,
    paddingHorizontal: 0,
    lineHeight: 20,
  },
  flavorSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
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
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailItem: {
    width: '100%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 18,
    color: '#CCCCCC',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#333333',
    marginTop: 4,
  },
  editFieldsContainer: {
    gap: 12,
  },
  editField: {
    marginBottom: 12,
  },
  editFieldLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontWeight: '400',
  },
  editTextInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#CCCCCC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#555555',
  },
  editControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
