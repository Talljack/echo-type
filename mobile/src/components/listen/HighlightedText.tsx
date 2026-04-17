import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import type { darkColors, lightColors } from '@/theme/colors';

interface HighlightedTextProps {
  text: string;
  currentWordIndex: number;
  onWordTap?: (wordIndex: number) => void;
}

type AppColors = typeof lightColors | typeof darkColors;

interface InteractiveWordProps {
  word: string;
  index: number;
  currentWordIndex: number;
  colors: AppColors;
  onWordTap?: (wordIndex: number) => void;
}

function InteractiveWord({ word, index, currentWordIndex, colors, onWordTap }: InteractiveWordProps) {
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
            { color: colors.onSurface },
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

export function HighlightedText({ text, currentWordIndex, onWordTap }: HighlightedTextProps) {
  const { colors } = useAppTheme();
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.wordsWrap}>
        {words.map((word, index) => (
          <InteractiveWord
            key={`${word}-${index}`}
            word={word}
            index={index}
            currentWordIndex={currentWordIndex}
            colors={colors}
            onWordTap={onWordTap}
          />
        ))}
      </View>
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
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    rowGap: 6,
    columnGap: 6,
  },
  wordPressable: {
    borderRadius: 4,
  },
  wordPressed: {
    opacity: 0.85,
  },
  word: {
    fontSize: 18,
    lineHeight: 32,
  },
  highlighted: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
