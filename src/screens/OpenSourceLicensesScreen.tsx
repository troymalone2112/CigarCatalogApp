import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function OpenSourceLicensesScreen() {
  const navigation = useNavigation();

  const licenses = [
    {
      name: 'React Native',
      version: '0.72.0',
      license: 'MIT',
      description: 'A framework for building native apps using React',
    },
    {
      name: 'Expo',
      version: '49.0.0',
      license: 'MIT',
      description: 'Platform for universal React applications',
    },
    {
      name: 'React Navigation',
      version: '6.0.0',
      license: 'MIT',
      description: 'Routing and navigation for React Native',
    },
    {
      name: 'Supabase',
      version: '1.0.0',
      license: 'MIT',
      description: 'Open source Firebase alternative',
    },
    {
      name: 'React Native SVG',
      version: '13.0.0',
      license: 'MIT',
      description: 'SVG library for React Native',
    },
    {
      name: 'React Native Gesture Handler',
      version: '2.0.0',
      license: 'MIT',
      description: 'Declarative API exposing platform native touch and gesture system',
    },
    {
      name: 'React Native Screens',
      version: '3.0.0',
      license: 'MIT',
      description: 'Native navigation primitives for React Native',
    },
    {
      name: 'React Native Safe Area Context',
      version: '4.0.0',
      license: 'MIT',
      description: 'Safe area context for React Native',
    },
    {
      name: 'React Native WebView',
      version: '13.0.0',
      license: 'MIT',
      description: 'WebView component for React Native',
    },
    {
      name: 'React Native Device Info',
      version: '10.0.0',
      license: 'MIT',
      description: 'Device information for React Native',
    },
    {
      name: 'React Native Async Storage',
      version: '1.0.0',
      license: 'MIT',
      description: 'Asynchronous, persistent, key-value storage system',
    },
    {
      name: 'React Native Purchases',
      version: '9.5.4',
      license: 'MIT',
      description: 'RevenueCat SDK for React Native',
    },
    {
      name: 'Expo Image Picker',
      version: '14.0.0',
      license: 'MIT',
      description: 'Provides access to the system UI for selecting images and videos',
    },
    {
      name: 'Expo Image Manipulator',
      version: '14.0.0',
      license: 'MIT',
      description: 'Provides an API to manipulate images',
    },
    {
      name: 'Expo File System',
      version: '15.0.0',
      license: 'MIT',
      description: 'Provides access to the file system on the device',
    },
    {
      name: 'Expo Camera',
      version: '13.0.0',
      license: 'MIT',
      description: 'Provides a React component that renders a preview for the device camera',
    },
    {
      name: 'Expo Location',
      version: '16.0.0',
      license: 'MIT',
      description: 'Provides access to device location information',
    },
    {
      name: 'Expo Constants',
      version: '14.0.0',
      license: 'MIT',
      description: 'System information that remains constant throughout the lifetime of your app',
    },
    {
      name: 'Expo Font',
      version: '11.0.0',
      license: 'MIT',
      description: 'Load fonts at runtime',
    },
    {
      name: 'Expo Linear Gradient',
      version: '12.0.0',
      license: 'MIT',
      description: 'Provides a React component that renders a gradient view',
    },
    {
      name: 'Expo Keep Awake',
      version: '12.0.0',
      license: 'MIT',
      description: 'Prevent the screen from sleeping',
    },
    {
      name: 'Expo Asset',
      version: '8.0.0',
      license: 'MIT',
      description: 'Provides an interface to access assets',
    },
  ];

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Open Source Licenses</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.description}>
            This app is built using open source software. We thank the developers and contributors of these projects.
          </Text>

          {licenses.map((license, index) => (
            <View key={index} style={styles.licenseItem}>
              <View style={styles.licenseHeader}>
                <Text style={styles.licenseName}>{license.name}</Text>
                <Text style={styles.licenseVersion}>v{license.version}</Text>
              </View>
              <Text style={styles.licenseDescription}>{license.description}</Text>
              <View style={styles.licenseFooter}>
                <Text style={styles.licenseType}>License: {license.license}</Text>
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All open source components are used in accordance with their respective licenses.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  tobaccoBackgroundImage: {
    opacity: 0.3,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  licenseItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  licenseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  licenseVersion: {
    fontSize: 14,
    color: '#DC851F',
    fontWeight: '600',
  },
  licenseDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 8,
  },
  licenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseType: {
    fontSize: 12,
    color: '#999999',
  },
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  footerText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
});


