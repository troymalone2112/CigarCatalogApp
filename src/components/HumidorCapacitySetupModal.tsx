import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HumidorCapacitySetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (capacity: number | null) => void;
  humidorName: string;
}

export default function HumidorCapacitySetupModal({
  visible,
  onClose,
  onSave,
  humidorName,
}: HumidorCapacitySetupModalProps) {
  const [capacity, setCapacity] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateCapacity = (value: string) => {
    const numValue = parseInt(value);
    const valid = value === '' || (numValue > 0 && numValue <= 10000);
    setIsValid(valid);
    return valid;
  };

  const handleCapacityChange = (value: string) => {
    setCapacity(value);
    validateCapacity(value);
  };

  const handleSave = () => {
    if (capacity.trim() === '') {
      // User chose not to set capacity
      onSave(null);
      return;
    }

    const numCapacity = parseInt(capacity);
    if (numCapacity <= 0 || numCapacity > 10000) {
      Alert.alert('Invalid Capacity', 'Please enter a capacity between 1 and 10,000 cigars.');
      return;
    }

    onSave(numCapacity);
  };

  const handleSkip = () => {
    onSave(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="cube" size={32} color="#DC851F" />
              </View>
              <Text style={styles.title}>Set Humidor Capacity</Text>
              <Text style={styles.subtitle}>
                How many cigars can your "{humidorName}" hold?
              </Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Capacity (optional)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    !isValid && capacity !== '' && styles.inputError
                  ]}
                  value={capacity}
                  onChangeText={handleCapacityChange}
                  placeholder="e.g., 100"
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Text style={styles.inputSuffix}>cigars</Text>
              </View>
              {!isValid && capacity !== '' && (
                <Text style={styles.errorText}>
                  Please enter a number between 1 and 10,000
                </Text>
              )}
              <Text style={styles.helpText}>
                This helps track how full your humidor is. You can change this later in settings.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  capacity.trim() === '' && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={capacity.trim() !== '' && !isValid}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {capacity.trim() === '' ? 'Save' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#DC851F',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#666666',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

