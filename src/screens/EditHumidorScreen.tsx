import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Humidor } from '../types';
import { DatabaseService } from '../services/supabaseService';

type EditHumidorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditHumidor'>;
type EditHumidorScreenRouteProp = RouteProp<RootStackParamList, 'EditHumidor'>;

export default function EditHumidorScreen() {
  const navigation = useNavigation<EditHumidorScreenNavigationProp>();
  const route = useRoute<EditHumidorScreenRouteProp>();
  const { humidor } = route.params;

  const [name, setName] = useState(humidor.name);
  const [description, setDescription] = useState(humidor.description || '');
  const [capacity, setCapacity] = useState(humidor.capacity?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleUpdateHumidor = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a humidor name');
      return;
    }

    try {
      setLoading(true);
      
      const capacityNumber = capacity.trim() ? parseInt(capacity.trim()) : undefined;
      
      if (capacityNumber && (isNaN(capacityNumber) || capacityNumber <= 0)) {
        Alert.alert('Error', 'Capacity must be a positive number');
        return;
      }

      const descriptionValue = description.trim() === '' ? null : description.trim();
      
      console.log('🔄 Updating humidor:', humidor.id, {
        name: name.trim(),
        description: descriptionValue,
        capacity: capacityNumber,
      });
      
      const updatedHumidor = await DatabaseService.updateHumidor(humidor.id, {
        name: name.trim(),
        description: descriptionValue,
        capacity: capacityNumber,
      });
      
      console.log('✅ Humidor updated successfully:', updatedHumidor);

      // Navigate back directly without popup
      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating humidor:', error);
      
      if (error.code === '23505') {
        Alert.alert('Error', 'A humidor with this name already exists');
      } else {
        Alert.alert('Error', 'Failed to update humidor. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHumidor = () => {
    Alert.alert(
      'Delete Humidor',
      `Are you sure you want to delete "${humidor.name}"? This action cannot be undone and will remove all cigars from this humidor.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteHumidor,
        },
      ]
    );
  };

  const confirmDeleteHumidor = async () => {
    try {
      setLoading(true);
      await DatabaseService.deleteHumidor(humidor.id);
      
      // Navigate back directly without popup
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting humidor:', error);
      Alert.alert('Error', 'Failed to delete humidor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
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
          <Text style={styles.headerTitle}>Edit Humidor</Text>
          <TouchableOpacity onPress={handleDeleteHumidor} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Main Humidor, Travel Humidor"
                placeholderTextColor="#666"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description of your humidor"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Capacity (Optional)</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="Maximum number of cigars"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.helpText}>
                Set a capacity limit to track when your humidor is getting full
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButtonStyle]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.updateButton, loading && styles.disabledButton]}
                onPress={handleUpdateHumidor}
                disabled={loading}
              >
                <Text style={styles.updateButtonText}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
  },
  cancelButtonText: {
    color: '#DC851F',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#DC851F',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
