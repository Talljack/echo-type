/**
 * Custom Toast Configuration
 * Themed toast messages for success, error, info, warning
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BaseToast, BaseToastProps, ErrorToast, InfoToast } from 'react-native-toast-message';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={styles.successToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={styles.errorToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      style={styles.infoToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
};

const styles = StyleSheet.create({
  successToast: {
    borderLeftColor: colors.success,
    borderLeftWidth: 5,
    backgroundColor: colors.surface,
    height: undefined,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  errorToast: {
    borderLeftColor: colors.error,
    borderLeftWidth: 5,
    backgroundColor: colors.surface,
    height: undefined,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  infoToast: {
    borderLeftColor: colors.primary,
    borderLeftWidth: 5,
    backgroundColor: colors.surface,
    height: undefined,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
  },
  text1: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  text2: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
