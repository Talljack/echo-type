import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <IconButton
        icon={isRecording ? 'stop' : 'microphone'}
        size={48}
        iconColor={isRecording ? colors.error : colors.primary}
        containerColor={isRecording ? colors.errorLight : colors.primaryContainer}
        onPress={onPress}
        disabled={disabled}
        style={styles.button}
      />
      <Text variant="labelMedium" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
        {isRecording ? 'Tap to Stop' : 'Tap to Speak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  button: {
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
  },
});
