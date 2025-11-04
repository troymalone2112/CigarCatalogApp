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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/supabaseService';
import { OptimizedHumidorService } from '../services/optimizedHumidorService';

type CreateHumidorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateHumidor'>;

export default function CreateHumidorScreen() {
  const navigation = useNavigation<CreateHumidorScreenNavigationProp>();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateHumidor = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a humidor name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
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

      console.log('🔄 Creating humidor with data:', {
        name: name.trim(),
        description: descriptionValue,
        capacity: capacityNumber,
      });

      const newHumidor = await DatabaseService.createHumidor(
        user.id,
        name.trim(),
        descriptionValue,
        capacityNumber,
      );

      console.log('✅ Humidor created successfully:', newHumidor);

      // Clear cache to ensure new humidor appears in the list
      console.log('🗑️ Clearing humidor cache to show new humidor...');
      await OptimizedHumidorService.clearCache(user.id);
      console.log('✅ Cache cleared, new humidor will appear in list');

      // Navigate back directly without popup
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating humidor:', error);

      if (error.code === '23505') {
        Alert.alert('Error', 'A humidor with this name already exists');
      } else {
        Alert.alert('Error', 'Failed to create humidor. Please try again.');
      }
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
          <Text style={styles.headerTitle}>Create Humidor</Text>
          <View style={styles.placeholder} />
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
                style={[styles.button, styles.createButton, loading && styles.disabledButton]}
                onPress={handleCreateHumidor}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>
                  {loading ? 'Creating...' : 'Create Humidor'}
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
  placeholder: {
    width: 40,
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
  createButton: {
    backgroundColor: '#DC851F',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
