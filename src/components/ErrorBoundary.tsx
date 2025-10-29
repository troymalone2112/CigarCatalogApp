import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    console.error('🚨 ErrorBoundary caught an error:', error);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error details
    console.error('🚨 ErrorBoundary componentDidCatch:', error, errorInfo);
    
    // Check for environment variable issues
    this.checkEnvironmentVariables();
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });
  }

  checkEnvironmentVariables = () => {
    const requiredVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_OPENAI_API_KEY',
      'EXPO_PUBLIC_PERPLEXITY_API_KEY',
      'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
    ];

    console.log('🔍 Checking environment variables:');
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
      if (!value) {
        console.error(`🚨 Missing required environment variable: ${varName}`);
      }
    });

    // Check if we're in a development environment
    console.log('🔍 Build environment info:');
    console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  __DEV__: ${__DEV__}`);
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning" size={48} color="#DC851F" style={styles.icon} />
            <Text style={styles.title}>App Initialization Error</Text>
            <Text style={styles.subtitle}>
              The app encountered an error during startup. This usually indicates missing configuration.
            </Text>

            <ScrollView style={styles.errorContainer} showsVerticalScrollIndicator={true}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>
                {this.state.error?.name}: {this.state.error?.message}
              </Text>
              
              {this.state.errorInfo && (
                <>
                  <Text style={styles.errorTitle}>Component Stack:</Text>
                  <Text style={styles.errorText}>{this.state.errorInfo}</Text>
                </>
              )}

              <Text style={styles.errorTitle}>Common Causes:</Text>
              <Text style={styles.troubleshootText}>
                • Missing environment variables (Supabase, API keys){'\n'}
                • Network connectivity issues{'\n'}
                • Invalid Supabase configuration{'\n'}
                • Missing RevenueCat configuration{'\n'}
                • Build configuration problems
              </Text>

              <Text style={styles.errorTitle}>Environment Check:</Text>
              <Text style={styles.troubleshootText}>
                Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅' : '❌'}{'\n'}
                Supabase Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}{'\n'}
                OpenAI Key: {process.env.EXPO_PUBLIC_OPENAI_API_KEY ? '✅' : '❌'}{'\n'}
                Perplexity Key: {process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY ? '✅' : '❌'}{'\n'}
                RevenueCat iOS Key: {process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ? '✅' : '❌'}
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.retryButton} onPress={this.resetError}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>

            <Text style={styles.supportText}>
              If this problem persists, please contact support with the error details above.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
    width: '100%',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC851F',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  troubleshootText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 10,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  supportText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
