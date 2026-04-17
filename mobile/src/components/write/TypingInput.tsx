import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

interface TypingInputProps {
  expectedText: string;
  currentInput: string;
  onInputChange: (text: string) => void;
  onError?: () => void;
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

export function TypingInput({ expectedText, currentInput, onInputChange, onError }: TypingInputProps) {
  const { colors, isDark } = useAppTheme();
  const progressTrackColor = isDark ? '#2C2C2E' : '#E5E7EB';

  const translateX = useSharedValue(0);
  const currentInputRef = useRef(currentInput);
  const wordStartOnErrorRef = useRef(0);
  const isRecoveringFromErrorRef = useRef(false);

  const [errorFlash, setErrorFlash] = useState(false);

  currentInputRef.current = currentInput;

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
    if (isRecoveringFromErrorRef.current) {
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        wordStartOnErrorRef.current = getWordStartForCursor(expectedText, currentInput.length);
        setErrorFlash(true);
        isRecoveringFromErrorRef.current = true;
        triggerShake();
        return;
      }

      const completesPassage = text.length === expectedText.length;
      if (!completesPassage && /\s/.test(newChar)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        style = styles.correct;
      } else {
        style = styles.incorrect;
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
      <Animated.Text
        key="current-word"
        style={[styles.charText, styles.text, shakeStyle, errorFlash && styles.wordErrorFlash]}
      >
        {currentWordNodes}
      </Animated.Text>,
    );

    for (let i = wordEnd; i < expectedText.length; i++) {
      nodes.push(renderChar(i));
    }

    return nodes;
  };

  const progress = expectedText.length > 0 ? (currentInput.length / expectedText.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.progressContainer, { backgroundColor: progressTrackColor }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.textDisplay}>
        <Text variant="bodyLarge" style={styles.text}>
          {renderTextChildren()}
        </Text>
      </View>

      <TextInput
        style={styles.hiddenInput}
        value={currentInput}
        onChangeText={handleTextChange}
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
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
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
  correct: {
    color: '#10B981',
  },
  incorrect: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  wordErrorFlash: {
    backgroundColor: '#FECACA',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
