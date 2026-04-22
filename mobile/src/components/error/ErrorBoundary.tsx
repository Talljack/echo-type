/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */
import * as Sentry from '@sentry/react-native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Capture exception in Sentry (production only)
    if (!__DEV__) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Oops! Something went wrong
            </Text>
            <Text variant="bodyLarge" style={styles.message}>
              We encountered an unexpected error. Please try again.
            </Text>

            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text variant="labelLarge" style={styles.errorTitle}>
                  Error Details (Dev Only):
                </Text>
                <Text variant="bodySmall" style={styles.errorText}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text variant="bodySmall" style={styles.stackTrace}>
                    {this.state.error.stack}
                  </Text>
                )}
              </View>
            )}

            <Button
              mode="contained"
              onPress={this.resetError}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Try Again
            </Button>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.onBackground,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  errorDetails: {
    width: '100%',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  errorTitle: {
    color: colors.error,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  errorText: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  stackTrace: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  button: {
    minWidth: 200,
  },
  buttonContent: {
    height: 48,
  },
});
