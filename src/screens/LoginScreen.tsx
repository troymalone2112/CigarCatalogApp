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

type LoginScreenNavigationProp = StackNavigationProp<any, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleLogin = async () => {
    if (isSubmitting || loading) return;

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();
      await signIn(email, password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
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
                account or log in.
              </Text>
              <Text style={styles.helperText}>
                Your account keeps your unique cigar journey private, safe, and always at your
                fingertips.
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
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
                    color="#999999"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (loading || isSubmitting) && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading || isSubmitting}
              >
                <Text style={styles.loginButtonText}>
                  {loading || isSubmitting ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={handleSignUp}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
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
    minWidth: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '400',
  },
  loginButton: {
    backgroundColor: '#DC851F',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  signUpLink: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '500',
  },
});
