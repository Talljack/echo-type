import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  return (
    <View style={styles.container}>
      <IconButton
        icon={isRecording ? 'stop' : 'microphone'}
        size={48}
        iconColor={isRecording ? '#EF4444' : '#6366F1'}
        containerColor={isRecording ? '#FEE2E2' : '#EEF2FF'}
        onPress={onPress}
        disabled={disabled}
        style={styles.button}
      />
      <Text variant="labelMedium" style={styles.label}>
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
    color: '#6B7280',
    fontWeight: '500',
  },
});
