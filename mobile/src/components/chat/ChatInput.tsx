import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const { colors } = useAppTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
      <TextInput
        style={[styles.input, { color: colors.onSurface, backgroundColor: colors.surfaceVariant }]}
        value={text}
        onChangeText={setText}
        placeholder="Type your message..."
        placeholderTextColor={colors.onSurfaceSecondary}
        multiline
        maxLength={2000}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <IconButton
        icon="send"
        size={24}
        iconColor={text.trim() && !disabled ? colors.primary : colors.disabled}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 20,
    marginRight: 4,
  },
});
