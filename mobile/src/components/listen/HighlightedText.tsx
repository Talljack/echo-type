import { useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { buildWordToSentenceMap, splitIntoSentenceSpans } from '@/lib/listen-sentences';
import type { darkColors, lightColors } from '@/theme/colors';

interface HighlightedTextProps {
  text: string;
  currentWordIndex: number;
  /** Sentence index aligned with `splitIntoSentenceSpans(text)`; -1 = none. */
  currentSentenceIndex: number;
  onWordTap?: (wordIndex: number) => void;
  /** Larger type and centered block when focus / immersive listen mode is on. */
  focusMode?: boolean;
  /** Y offset of the active sentence within this component root (for parent ScrollView). */
  onSentenceScrollOffset?: (offsetY: number) => void;
}

type AppColors = typeof lightColors | typeof darkColors;

interface InteractiveWordProps {
  word: string;
  index: number;
  currentWordIndex: number;
  colors: AppColors;
  onWordTap?: (wordIndex: number) => void;
  fontSize: number;
  lineHeight: number;
}

function InteractiveWord({
  word,
  index,
  currentWordIndex,
  colors,
  onWordTap,
  fontSize,
  lineHeight,
}: InteractiveWordProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isHighlighted = index === currentWordIndex;
  const isPast = index < currentWordIndex;

  const handlePress = () => {
    if (!onWordTap) return;
    void haptics.tap();
    scale.value = withSequence(withTiming(1.1, { duration: 90 }), withTiming(1, { duration: 130 }));
    onWordTap(index);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Word: ${word}`}
      disabled={!onWordTap}
      onPress={handlePress}
      style={({ pressed }) => [styles.wordPressable, onWordTap && pressed && styles.wordPressed]}
    >
      <Animated.View style={animatedStyle}>
        <Text
          variant="bodyLarge"
          style={[
            styles.word,
            { color: colors.onSurface, fontSize, lineHeight },
            isPast && { color: colors.onSurfaceSecondary },
            isHighlighted && [styles.highlighted, { backgroundColor: colors.warningLight, color: colors.onSurface }],
          ]}
        >
          {word}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface SentenceBlockProps {
  words: { word: string; globalIndex: number }[];
  currentWordIndex: number;
  currentSentenceIndex: number;
  sentenceIndex: number;
  colors: AppColors;
  primaryContainer: string;
  onWordTap?: (wordIndex: number) => void;
  fontSize: number;
  lineHeight: number;
  focusMode: boolean;
  onSentenceLayout: (sentenceIndex: number, y: number) => void;
}

function SentenceBlock({
  words,
  currentWordIndex,
  currentSentenceIndex,
  sentenceIndex,
  colors,
  primaryContainer,
  onWordTap,
  fontSize,
  lineHeight,
  focusMode,
  onSentenceLayout,
}: SentenceBlockProps) {
  const highlightOpacity = useSharedValue(0);
  const isActive = sentenceIndex === currentSentenceIndex && currentSentenceIndex >= 0;

  useEffect(() => {
    highlightOpacity.value = withTiming(isActive ? 1 : 0, { duration: 240 });
  }, [isActive, highlightOpacity]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    onSentenceLayout(sentenceIndex, e.nativeEvent.layout.y);
  };

  return (
    <View
      style={[styles.sentenceBlock, focusMode && styles.sentenceBlockFocus]}
      onLayout={handleLayout}
      collapsable={false}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.sentenceHighlightBg,
          { backgroundColor: primaryContainer },
          highlightStyle,
        ]}
      />
      <View style={[styles.wordsWrap, focusMode && styles.wordsWrapFocus]}>
        {words.map(({ word, globalIndex }) => (
          <InteractiveWord
            key={`${word}-${globalIndex}`}
            word={word}
            index={globalIndex}
            currentWordIndex={currentWordIndex}
            colors={colors}
            onWordTap={onWordTap}
            fontSize={fontSize}
            lineHeight={lineHeight}
          />
        ))}
      </View>
    </View>
  );
}

export function HighlightedText({
  text,
  currentWordIndex,
  currentSentenceIndex,
  onWordTap,
  focusMode = false,
  onSentenceScrollOffset,
}: HighlightedTextProps) {
  const { colors } = useAppTheme();
  const words = useMemo(() => text.split(/\s+/).filter((w) => w.length > 0), [text]);
  const sentenceSpans = useMemo(() => splitIntoSentenceSpans(text), [text]);
  const wordToSentence = useMemo(
    () => buildWordToSentenceMap(text, words, sentenceSpans),
    [text, words, sentenceSpans],
  );

  const sentenceWordGroups = useMemo(() => {
    const groups: { word: string; globalIndex: number }[][] = sentenceSpans.map(() => []);
    words.forEach((word, globalIndex) => {
      const si = wordToSentence.get(globalIndex) ?? 0;
      if (!groups[si]) groups[si] = [];
      groups[si].push({ word, globalIndex });
    });
    return groups;
  }, [words, sentenceSpans, wordToSentence]);

  const sentenceTopsRef = useRef<number[]>([]);
  const lastScrollSentence = useRef<number>(-1);

  useEffect(() => {
    lastScrollSentence.current = -1;
    sentenceTopsRef.current = [];
  }, [text]);

  useEffect(() => {
    if (!onSentenceScrollOffset || currentSentenceIndex < 0) return;
    if (lastScrollSentence.current === currentSentenceIndex) return;
    lastScrollSentence.current = currentSentenceIndex;
    const y = sentenceTopsRef.current[currentSentenceIndex];
    if (typeof y === 'number') {
      // layout.y is relative to the sentence column; add root padding so parent ScrollView aligns correctly.
      onSentenceScrollOffset(ROOT_VERTICAL_PADDING + y);
    }
  }, [currentSentenceIndex, onSentenceScrollOffset]);

  const fontSize = focusMode ? 24 : 18;
  const lineHeight = focusMode ? 40 : 32;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, focusMode && styles.containerFocus]}>
      <View style={[styles.sentenceColumn, focusMode && styles.sentenceColumnFocus]}>
        {sentenceWordGroups.map((group, sentenceIndex) => (
          <SentenceBlock
            key={`s-${sentenceIndex}`}
            words={group}
            currentWordIndex={currentWordIndex}
            currentSentenceIndex={currentSentenceIndex}
            sentenceIndex={sentenceIndex}
            colors={colors}
            primaryContainer={colors.primaryContainer}
            onWordTap={onWordTap}
            fontSize={fontSize}
            lineHeight={lineHeight}
            focusMode={focusMode}
            onSentenceLayout={(idx, y) => {
              sentenceTopsRef.current[idx] = y;
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Must match `styles.container` vertical padding. */
const ROOT_VERTICAL_PADDING = 20;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: ROOT_VERTICAL_PADDING,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  containerFocus: {
    marginBottom: 0,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  sentenceColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  sentenceColumnFocus: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  sentenceBlock: {
    position: 'relative',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  sentenceBlockFocus: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  sentenceHighlightBg: {
    borderRadius: 10,
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    rowGap: 6,
    columnGap: 6,
  },
  wordsWrapFocus: {
    justifyContent: 'center',
  },
  wordPressable: {
    borderRadius: 4,
  },
  wordPressed: {
    opacity: 0.85,
  },
  word: {
    fontWeight: '400',
  },
  highlighted: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
