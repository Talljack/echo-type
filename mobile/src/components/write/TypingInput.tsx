import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';

interface TypingInputProps {
  expectedText: string;
  currentInput: string;
  onInputChange: (text: string) => void;
  onError?: () => void;
  /** When true, hides keyboard and blocks edits (e.g. paused). */
  disabled?: boolean;
}

/** Start index of the expected "token" at cursor: either a whitespace run or a word (non-whitespace). */
function getWordStartForCursor(expected: string, cursorIndex: number): number {
  if (cursorIndex <= 0) return 0;
  if (cursorIndex > expected.length) return expected.length;
  if (/\s/.test(expected[cursorIndex]!)) {
    return cursorIndex;
  }
  let start = cursorIndex;
  while (start > 0 && !/\s/.test(expected[start - 1]!)) {
    start--;
  }
  return start;
}

/** Exclusive end index of the token starting at `start`. */
function getWordEndForStart(expected: string, start: number): number {
  if (start >= expected.length) return expected.length;
  if (/\s/.test(expected[start]!)) {
    let e = start;
    while (e < expected.length && /\s/.test(expected[e]!)) {
      e++;
    }
    return e;
  }
  let e = start;
  while (e < expected.length && !/\s/.test(expected[e]!)) {
    e++;
  }
  return e;
}

const SHAKE_STEP_MS = 75;

export function TypingInput({
  expectedText,
  currentInput,
  onInputChange,
  onError,
  disabled = false,
}: TypingInputProps) {
  const { colors, isDark } = useAppTheme();
  const progressTrackColor = isDark ? colors.surfaceVariant : colors.borderLight;

  const translateX = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);
  const currentInputRef = useRef(currentInput);
  const wordStartOnErrorRef = useRef(0);
  const isRecoveringFromErrorRef = useRef(false);

  const [errorFlash, setErrorFlash] = useState(false);

  currentInputRef.current = currentInput;

  useEffect(() => {
    if (disabled) {
      inputRef.current?.blur();
      return;
    }
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [disabled]);

  const finishErrorRecovery = useCallback(() => {
    const ws = wordStartOnErrorRef.current;
    const prefix = currentInputRef.current.slice(0, ws);
    onInputChange(prefix);
    setErrorFlash(false);
    isRecoveringFromErrorRef.current = false;
  }, [onInputChange]);

  const triggerShake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(-8, { duration: SHAKE_STEP_MS }),
      withTiming(8, { duration: SHAKE_STEP_MS }),
      withTiming(-8, { duration: SHAKE_STEP_MS }),
      withTiming(0, { duration: SHAKE_STEP_MS }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(finishErrorRecovery)();
        }
      }),
    );
  }, [finishErrorRecovery, translateX]);

  // Reset shake offset when switching to different practice text
  // biome-ignore lint/correctness/useExhaustiveDependencies: shared value is not a reactive dependency
  useEffect(() => {
    translateX.value = 0;
  }, [expectedText]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTextChange = (text: string) => {
    if (disabled || isRecoveringFromErrorRef.current) {
      return;
    }

    if (text.length > currentInput.length) {
      const newChar = text[text.length - 1]!;
      const expectedChar = expectedText[text.length - 1];
      if (expectedChar === undefined) {
        return;
      }

      if (newChar !== expectedChar) {
        onError?.();
        void haptics.error();
        wordStartOnErrorRef.current = getWordStartForCursor(expectedText, currentInput.length);
        setErrorFlash(true);
        isRecoveringFromErrorRef.current = true;
        triggerShake();
        return;
      }

      const completesPassage = text.length === expectedText.length;
      if (completesPassage) {
        void haptics.success();
      } else if (/\s/.test(newChar)) {
        void haptics.medium();
      } else {
        void haptics.light();
      }
    }

    onInputChange(text);
  };

  const cursor = currentInput.length;
  const refIndexForWord = expectedText.length === 0 ? 0 : Math.min(cursor, Math.max(expectedText.length - 1, 0));
  const wordStart = getWordStartForCursor(expectedText, refIndexForWord);
  const wordEnd = getWordEndForStart(expectedText, wordStart);

  const charStyleForIndex = (index: number) => {
    let style: { color?: string; backgroundColor?: string } = { color: colors.onSurfaceSecondary };
    if (index < currentInput.length) {
      if (currentInput[index] === expectedText[index]) {
        style = { color: colors.success };
      } else {
        style = { color: colors.error, backgroundColor: colors.errorLight };
      }
    } else if (index === currentInput.length) {
      style = { backgroundColor: colors.warningLight };
    }
    return style;
  };

  const renderChar = (index: number) => {
    const char = expectedText[index]!;
    return (
      <Text key={index} style={[styles.charText, charStyleForIndex(index)]}>
        {char}
      </Text>
    );
  };

  const renderTextChildren = (): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < wordStart; i++) {
      nodes.push(renderChar(i));
    }

    const currentWordNodes: React.ReactNode[] = [];
    for (let i = wordStart; i < wordEnd; i++) {
      currentWordNodes.push(renderChar(i));
    }

    nodes.push(
      <View
        key="current-word-wrap"
        style={[
          styles.currentWordGlow,
          {
            shadowColor: colors.primary,
            borderColor: colors.primaryLight,
            backgroundColor: colors.primaryContainer,
          },
        ]}
      >
        <Animated.Text
          key="current-word"
          style={[styles.charText, styles.text, shakeStyle, errorFlash && { backgroundColor: colors.errorLight }]}
        >
          {currentWordNodes}
        </Animated.Text>
      </View>,
    );

    for (let i = wordEnd; i < expectedText.length; i++) {
      nodes.push(renderChar(i));
    }

    return nodes;
  };

  const progress = expectedText.length > 0 ? (currentInput.length / expectedText.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.progressContainer, { backgroundColor: progressTrackColor, borderColor: colors.border }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.textDisplay}>
        <Text variant="bodyLarge" style={styles.text}>
          {renderTextChildren()}
        </Text>
      </View>

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={currentInput}
        onChangeText={handleTextChange}
        editable={!disabled}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        maxLength={expectedText.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressContainer: {
    height: 8,
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  textDisplay: {
    minHeight: 200,
  },
  text: {
    lineHeight: 32,
    fontSize: 18,
  },
  charText: {
    lineHeight: 32,
    fontSize: 18,
  },
  currentWordGlow: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
