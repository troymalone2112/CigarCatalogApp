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

type OnboardingAgeVerificationNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingAgeVerification'>;

export default function OnboardingAgeVerificationScreen() {
  const navigation = useNavigation<OnboardingAgeVerificationNavigationProp>();
  const [ageVerified, setAgeVerified] = useState(false);

  const handleContinue = () => {
    if (ageVerified) {
      navigation.navigate('OnboardingExperience');
    }
  };

  const handleSkip = () => {
    // Allow users to skip onboarding and complete later
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
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>1 of 4</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '25%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={80} color="#DC851F" />
          </View>
          
          <Text style={styles.title}>Age Verification</Text>
          
          <Text style={styles.subtitle}>
            You must be 18 years or older to use this app
          </Text>

          <View style={styles.ageVerificationContainer}>
            <TouchableOpacity 
              style={[styles.checkboxContainer, ageVerified && styles.checkboxContainerActive]}
              onPress={() => setAgeVerified(!ageVerified)}
            >
              <Ionicons 
                name={ageVerified ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={ageVerified ? "#7C2D12" : "#999"} 
              />
              <Text style={[styles.checkboxText, ageVerified && styles.checkboxTextActive]}>
                I am 18 years or older
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerTitle}>Legal Notice</Text>
            <Text style={styles.disclaimerText}>
              This app is intended for adults only. Tobacco products are not recommended for minors, 
              pregnant women, or individuals with certain health conditions. Please smoke responsibly.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.continueButton, !ageVerified && styles.continueButtonDisabled]} 
            onPress={handleContinue}
            disabled={!ageVerified}
          >
            <Text style={[styles.continueButtonText, !ageVerified && styles.continueButtonTextDisabled]}>
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
  },
  progressIndicator: {
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
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFA737',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  ageVerificationContainer: {
    width: '100%',
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
  },
  checkboxContainerActive: {
    borderColor: '#DC851F',
    backgroundColor: '#2a1a0a',
  },
  checkboxText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 12,
    fontWeight: '400',
  },
  checkboxTextActive: {
    color: '#CCCCCC',
  },
  disclaimerContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
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

