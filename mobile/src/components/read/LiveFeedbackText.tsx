import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface LiveFeedbackTextProps {
  words: string[];
  recognizedWords: string[];
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

function getWordStatus(expected: string, recognized: string | undefined): 'pending' | 'correct' | 'close' | 'wrong' {
  if (!recognized) return 'pending';
  const e = expected.toLowerCase().replace(/[^a-z0-9]/g, '');
  const r = recognized.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (e === r) return 'correct';
  const dist = levenshteinDistance(e, r);
  const maxLen = Math.max(e.length, r.length);
  if (maxLen === 0) return 'correct';
  const similarity = 1 - dist / maxLen;
  if (similarity >= 0.6) return 'close';
  return 'wrong';
}

export function LiveFeedbackText({ words, recognizedWords }: LiveFeedbackTextProps) {
  const { colors } = useAppTheme();
  const statusColor = {
    correct: colors.success,
    close: colors.warning,
    wrong: colors.error,
    pending: undefined,
  } as const;

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.onSurface }]}>
        {words.map((word, i) => {
          const status = getWordStatus(word, recognizedWords[i]);
          const color = statusColor[status] ?? colors.onSurface;
          const weight = status === 'pending' ? '400' : '600';
          return (
            <Text key={`${word}-${i}`} style={{ color, fontWeight: weight }}>
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  text: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: fontFamily.body,
  },
});
