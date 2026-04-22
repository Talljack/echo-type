import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { VoiceRecognition } from '@/lib/voice/index';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  showVoiceButton?: boolean;
}

export function ChatInput({ onSend, disabled = false, showVoiceButton = false }: ChatInputProps) {
  const { colors } = useAppTheme();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const transcriptRef = useRef('');
  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 450 }), withTiming(1, { duration: 450 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 120 });
    }
  }, [isRecording, pulse]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleVoiceIn = useCallback(async () => {
    if (disabled || Platform.OS === 'web') return;
    transcriptRef.current = '';
    setIsRecording(true);
    await VoiceRecognition.start({
      language: 'en-US',
      onResult: (t) => {
        transcriptRef.current = t;
      },
      onError: () => {
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
      },
    });
  }, [disabled]);

  const handleVoiceOut = useCallback(async () => {
    if (Platform.OS === 'web') return;
    await VoiceRecognition.stop();
    setIsRecording(false);
    const spoken = transcriptRef.current.trim();
    transcriptRef.current = '';
    if (spoken) {
      onSend(spoken);
    }
  }, [onSend]);

  useEffect(() => {
    return () => {
      void VoiceRecognition.destroy();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
      {showVoiceButton && Platform.OS !== 'web' ? (
        <Animated.View style={[styles.micWrap, pulseStyle]}>
          <Pressable
            accessibilityLabel="Hold to speak"
            disabled={disabled}
            onPressIn={handleVoiceIn}
            onPressOut={handleVoiceOut}
            style={({ pressed }) => [
              styles.micButton,
              {
                backgroundColor: isRecording ? colors.errorLight : colors.surfaceVariant,
                opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isRecording ? 'microphone' : 'microphone-outline'}
              size={22}
              color={isRecording ? colors.error : colors.primary}
            />
          </Pressable>
        </Animated.View>
      ) : null}
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
  micWrap: {
    marginRight: 4,
    marginBottom: 6,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
