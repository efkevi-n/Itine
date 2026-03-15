import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const ERROR_TITLE = 'Something went wrong. Please restart the app.';
const RESTART_LABEL = 'Restart';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRestart = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{ERROR_TITLE}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>{RESTART_LABEL}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.radius.lg,
  },
  title: {
    fontSize: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.radius.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.radius.md,
    paddingHorizontal: theme.radius.lg,
    borderRadius: theme.radius.sm,
  },
  buttonText: {
    fontSize: theme.fonts.medium,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
