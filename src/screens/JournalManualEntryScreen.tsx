import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, RecognitionMode } from '../types';
import { APIService } from '../services/apiService';

type JournalManualEntryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'JournalManualEntry'
>;
type JournalManualEntryScreenRouteProp = RouteProp<RootStackParamList, 'JournalManualEntry'>;

export default function JournalManualEntryScreen() {
  const navigation = useNavigation<JournalManualEntryScreenNavigationProp>();
  const route = useRoute<JournalManualEntryScreenRouteProp>();

  const [manualDescription, setManualDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processManualEntry = async () => {
    if (!manualDescription.trim()) {
      Alert.alert('Error', 'Please enter a description of the cigar');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await APIService.recognizeCigar(RecognitionMode.PERPLEXITY_ONLY, {
        userDescription: manualDescription,
      });

      navigation.navigate('CigarRecognition', { manualResult: result });
      setManualDescription('');
    } catch (error) {
      console.error('Error processing manual entry:', error);
      Alert.alert('Error', 'Failed to identify cigar. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fullScreenBackground}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ImageBackground
          source={require('../../assets/tobacco-leaves-bg.jpg')}
          style={styles.fullScreenBackground}
          imageStyle={styles.tobaccoBackgroundImage}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.subtitle}>
              Provide details about the brand, line, size, or any identifying features
            </Text>

            <TextInput
              style={styles.textInput}
              value={manualDescription}
              onChangeText={setManualDescription}
              placeholder="e.g., Cohiba Behike 52, Romeo y Julieta Churchill, Arturo Fuente Opus X..."
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              blurOnSubmit={true}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={processManualEntry}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="search" size={20} color="white" />
              )}
              <Text style={styles.submitButtonText}>
                {isProcessing ? 'Searching...' : 'Search'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  textInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#999',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#555',
    marginBottom: 30,
  },
  submitButton: {
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
