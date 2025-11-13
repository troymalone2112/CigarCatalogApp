import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../storage/storageService';

type OnboardingAgeVerificationNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OnboardingAgeVerification'
>;
type OnboardingAgeVerificationRouteProp = RouteProp<
  RootStackParamList,
  'OnboardingAgeVerification'
>;

export default function OnboardingAgeVerificationScreen() {
  const navigation = useNavigation<OnboardingAgeVerificationNavigationProp>();
  const route = useRoute<OnboardingAgeVerificationRouteProp>();
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onComplete = route.params?.onComplete;

  const parsedMonth = useMemo(() => parseInt(birthMonth, 10), [birthMonth]);
  const parsedYear = useMemo(() => parseInt(birthYear, 10), [birthYear]);

  const ageCheck = useMemo(() => {
    if (!birthMonth || !birthYear) {
      return { valid: false, age: null as number | null };
    }

    if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
      return { valid: false, age: null as number | null };
    }

    if (!parsedYear || birthYear.length !== 4 || parsedYear > new Date().getFullYear()) {
      return { valid: false, age: null as number | null };
    }

    const today = new Date();
    const birthDate = new Date(parsedYear, parsedMonth - 1, 1);
    const age = today.getFullYear() - parsedYear - (today.getMonth() < parsedMonth - 1 ? 1 : 0);

    return { valid: true, age };
  }, [birthMonth, birthYear, parsedMonth, parsedYear]);

  const handleContinue = () => {
    setErrorMessage(null);

    if (!ageCheck.valid || ageCheck.age === null) {
      setErrorMessage('Please enter a valid month and year.');
      return;
    }

    if (ageCheck.age < 21) {
      Alert.alert(
        'Not Eligible',
        'You must be at least 21 years old to use this app. Please come back when you are of legal age.',
        [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }],
      );
      return;
    }

    navigation.navigate('OnboardingExperience');
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

          <Text style={styles.subtitle}>You must be 21 years or older to use this app</Text>

          <View style={styles.ageVerificationContainer}>
            <Text style={styles.inputLabel}>Birth Month</Text>
            <TextInput
              style={styles.textInput}
              placeholder="MM"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={2}
              value={birthMonth}
              onChangeText={(text) => {
                setBirthMonth(text.replace(/[^0-9]/g, ''));
                setErrorMessage(null);
              }}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Birth Year</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={4}
              value={birthYear}
              onChangeText={(text) => {
                setBirthYear(text.replace(/[^0-9]/g, ''));
                setErrorMessage(null);
              }}
            />
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </View>

          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerTitle}>Legal Notice</Text>
            <Text style={styles.disclaimerText}>
              This app is intended for adults only. Tobacco products are not recommended for minors,
              pregnant women, or individuals with certain health conditions. Please smoke
              responsibly.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Continue
            </Text>
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
  inputLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#CCCCCC',
    fontSize: 14,
  },
  errorText: {
    color: '#dc3545',
    marginTop: 12,
    fontSize: 12,
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
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
