import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ImageBackground,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type OnboardingExperienceNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingExperience'>;

const experienceOptions = [
  { key: 'none', label: 'I don\'t smoke cigars yet', description: 'Just getting started' },
  { key: 'less-than-1', label: 'Less than 1 year', description: 'New to the world of cigars' },
  { key: '1-2', label: '1-2 years', description: 'Starting to explore different brands' },
  { key: '3-5', label: '3-5 years', description: 'Developing preferences' },
  { key: '6-10', label: '6-10 years', description: 'Experienced with various types' },
  { key: 'more-than-10', label: 'More than 10 years', description: 'Long-time cigar enthusiast' },
];

export default function OnboardingExperienceScreen() {
  const navigation = useNavigation<OnboardingExperienceNavigationProp>();
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedDuration) {
      // Store the selection and move to next screen
      navigation.navigate('OnboardingLevel', { smokingDuration: selectedDuration });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#CCCCCC" />
          </TouchableOpacity>
          
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>2 of 4</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={80} color="#7C2D12" />
          </View>
          
          <Text style={styles.title}>Smoking Experience</Text>
          
          <Text style={styles.subtitle}>
            How long have you been smoking cigars?
          </Text>

          <View style={styles.optionsContainer}>
            {experienceOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  selectedDuration === option.key && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedDuration(option.key)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    selectedDuration === option.key && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedDuration === option.key && styles.optionDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons 
                  name={selectedDuration === option.key ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={selectedDuration === option.key ? "#DC851F" : "#999999"} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.continueButton, !selectedDuration && styles.continueButtonDisabled]} 
            onPress={handleContinue}
            disabled={!selectedDuration}
          >
            <Text style={[styles.continueButtonText, !selectedDuration && styles.continueButtonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  progressIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC851F',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFA737',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    marginBottom: 12,
  },
  optionButtonSelected: {
    borderColor: '#DC851F',
    backgroundColor: '#2a1a0a',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#CCCCCC',
  },
  optionDescription: {
    fontSize: 14,
    color: '#999999',
  },
  optionDescriptionSelected: {
    color: '#FFA737',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#DC851F',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButtonTextDisabled: {
    color: '#666',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '400',
  },
});

