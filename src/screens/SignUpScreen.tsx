import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

type SignUpScreenNavigationProp = StackNavigationProp<any, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { signUp, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSignUp = async () => {
    if (isSubmitting || loading) return;

    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();
      await signUp(email, password, fullName);
      // Navigate to login directly without popup
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred during sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome to Your Personal Humidor</Text>
              <Text style={styles.subtitle}>
                To bring you a tailored experience, securely save your cigar collection, and
                preserve your tasting notes and ratings across all your devices, please create an
                account.
              </Text>
              <Text style={styles.helperText}>
                Your account keeps your unique cigar journey private, safe, and always at your
                fingertips.
              </Text>
            </View>

            {/* Sign Up Form */}
            <View style={styles.form}>
              {/* Screen Name Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#DC851F"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Screen Name"
                  placeholderTextColor="#999999"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#DC851F" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#DC851F"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#DC851F"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signUpButton,
                  (loading || isSubmitting) && styles.signUpButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={loading || isSubmitting}
              >
                <Text style={styles.signUpButtonText}>
                  {loading || isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={handleLogin}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  tobaccoBackgroundImage: {
    opacity: 0.15,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFA737',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  form: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#555555',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555555',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
    color: '#DC851F',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  signUpButton: {
    backgroundColor: '#DC851F',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  signUpButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  loginLink: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '500',
  },
});
