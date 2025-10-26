import { Alert } from 'react-native';

export interface RecognitionError {
  code: string;
  message: string;
  type: 'quota' | 'network' | 'api' | 'parsing' | 'unknown';
  canRetry: boolean;
  fallbackOptions: string[];
}

export class RecognitionErrorHandler {
  /**
   * Parse API errors and determine the best recovery strategy
   */
  static parseError(error: any): RecognitionError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.code || error?.status?.toString() || 'unknown';

    // OpenAI quota exceeded
    if (errorCode === '429' || errorMessage.includes('quota') || errorMessage.includes('billing')) {
      return {
        code: errorCode,
        message: 'Recognition service quota exceeded',
        type: 'quota',
        canRetry: false,
        fallbackOptions: ['Manual Entry', 'Try Later']
      };
    }

    // Network connectivity issues
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return {
        code: errorCode,
        message: 'Network connection issue',
        type: 'network',
        canRetry: true,
        fallbackOptions: ['Try Again', 'Manual Entry']
      };
    }

    // API key issues
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return {
        code: errorCode,
        message: 'API authentication failed',
        type: 'api',
        canRetry: false,
        fallbackOptions: ['Manual Entry']
      };
    }

    // JSON parsing errors
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return {
        code: errorCode,
        message: 'Data processing error',
        type: 'parsing',
        canRetry: true,
        fallbackOptions: ['Try Again', 'Manual Entry']
      };
    }

    // Generic API errors
    if (errorMessage.includes('Failed to identify') || errorMessage.includes('Failed to recognize')) {
      return {
        code: errorCode,
        message: 'Unable to identify cigar details',
        type: 'api',
        canRetry: true,
        fallbackOptions: ['Try Again', 'Manual Entry', 'Try Different Photo']
      };
    }

    // Default fallback
    return {
      code: errorCode,
      message: 'Recognition failed',
      type: 'unknown',
      canRetry: true,
      fallbackOptions: ['Try Again', 'Manual Entry']
    };
  }

  /**
   * Show user-friendly error dialog with appropriate options
   */
  static showErrorDialog(
    error: RecognitionError,
    onRetry?: () => void,
    onManualEntry?: () => void,
    onTryLater?: () => void,
    onTryDifferentPhoto?: () => void
  ): void {
    const buttons = [];

    // Add retry button if applicable
    if (error.canRetry && onRetry) {
      buttons.push({
        text: 'Try Again',
        onPress: onRetry,
        style: 'default' as const
      });
    }

    // Add fallback options
    if (error.fallbackOptions.includes('Manual Entry') && onManualEntry) {
      buttons.push({
        text: 'Manual Entry',
        onPress: onManualEntry,
        style: 'default' as const
      });
    }

    if (error.fallbackOptions.includes('Try Different Photo') && onTryDifferentPhoto) {
      buttons.push({
        text: 'Try Different Photo',
        onPress: onTryDifferentPhoto,
        style: 'default' as const
      });
    }

    if (error.fallbackOptions.includes('Try Later') && onTryLater) {
      buttons.push({
        text: 'Try Later',
        onPress: onTryLater,
        style: 'default' as const
      });
    }

    // Always add cancel option
    buttons.push({
      text: 'Cancel',
      style: 'cancel' as const
    });

    Alert.alert(
      this.getErrorTitle(error),
      this.getErrorMessage(error),
      buttons
    );
  }

  /**
   * Get user-friendly error title based on error type
   */
  private static getErrorTitle(error: RecognitionError): string {
    switch (error.type) {
      case 'quota':
        return 'Service Temporarily Unavailable';
      case 'network':
        return 'Connection Issue';
      case 'api':
        return 'Recognition Failed';
      case 'parsing':
        return 'Processing Error';
      default:
        return 'Recognition Error';
    }
  }

  /**
   * Get user-friendly error message based on error type
   */
  private static getErrorMessage(error: RecognitionError): string {
    switch (error.type) {
      case 'quota':
        return 'Our recognition service is temporarily unavailable due to high usage. Please try manual entry or come back later.';
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'api':
        return 'We couldn\'t identify the cigar details from this image. Try a clearer photo or manual entry.';
      case 'parsing':
        return 'There was an issue processing the recognition data. Please try again.';
      default:
        return 'Something went wrong during recognition. Please try again or use manual entry.';
    }
  }

  /**
   * Get suggested actions for the error
   */
  static getSuggestedActions(error: RecognitionError): string[] {
    const actions = [];

    if (error.type === 'quota') {
      actions.push('Use manual entry instead');
      actions.push('Try again in a few hours');
      actions.push('Contact support if issue persists');
    } else if (error.type === 'network') {
      actions.push('Check your internet connection');
      actions.push('Move to an area with better signal');
      actions.push('Try again in a moment');
    } else if (error.type === 'api') {
      actions.push('Take a clearer photo of the cigar');
      actions.push('Ensure good lighting');
      actions.push('Try manual entry as backup');
    }

    return actions;
  }
}






