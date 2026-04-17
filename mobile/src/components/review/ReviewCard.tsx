import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { type FSRSCardData, previewRatings, Rating, State } from '@/lib/fsrs';

interface FSRSCard {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  fsrsData: FSRSCardData;
}

interface ReviewCardProps {
  card: FSRSCard;
  onRate: (rating: Rating) => void;
}

export function ReviewCard({ card, onRate }: ReviewCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const { colors, isDark } = useAppTheme();
  const dividerColor = isDark ? '#2C2C2E' : '#E5E7EB';

  const intervals = previewRatings(card.fsrsData);

  const ratingButtons: { rating: Rating; label: string; color: string; interval: string }[] = [
    { rating: Rating.Again, label: 'Again', color: '#EF4444', interval: intervals[Rating.Again].interval },
    { rating: Rating.Hard, label: 'Hard', color: '#F59E0B', interval: intervals[Rating.Hard].interval },
    { rating: Rating.Good, label: 'Good', color: '#10B981', interval: intervals[Rating.Good].interval },
    { rating: Rating.Easy, label: 'Easy', color: '#6366F1', interval: intervals[Rating.Easy].interval },
  ];

  return (
    <View style={styles.container}>
      {/* Front of card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text variant="labelSmall" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
          {card.fsrsData.state === State.New ? 'NEW' : `Review #${card.fsrsData.reps}`}
        </Text>
        <Text variant="headlineMedium" style={[styles.word, { color: colors.onSurface }]}>
          {card.word}
        </Text>

        {!showAnswer ? (
          <TouchableOpacity
            style={[styles.showButton, { backgroundColor: colors.primaryContainer }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAnswer(true);
            }}
            activeOpacity={0.7}
          >
            <Text variant="bodyLarge" style={[styles.showButtonText, { color: colors.primary }]}>
              Show Answer
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <Text variant="bodyLarge" style={[styles.meaning, { color: colors.onSurface }]}>
              {card.meaning}
            </Text>
            {card.example && (
              <Text variant="bodyMedium" style={[styles.example, { color: colors.onSurfaceSecondary }]}>
                {card.example}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Rating buttons */}
      {showAnswer && (
        <View style={styles.ratingContainer}>
          {ratingButtons.map((btn) => (
            <TouchableOpacity
              key={btn.rating}
              style={[styles.ratingButton, { borderColor: btn.color, backgroundColor: colors.surface }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRate(btn.rating);
                setShowAnswer(false);
              }}
              activeOpacity={0.7}
            >
              <Text variant="labelLarge" style={[styles.ratingLabel, { color: btn.color }]}>
                {btn.label}
              </Text>
              <Text variant="labelSmall" style={[styles.ratingInterval, { color: colors.onSurfaceSecondary }]}>
                {btn.interval}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minHeight: 300,
    justifyContent: 'center',
  },
  label: {
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 16,
  },
  word: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  showButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  showButtonText: {
    fontWeight: '600',
  },
  divider: {
    width: '80%',
    height: 1,
    marginBottom: 24,
  },
  meaning: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  example: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  ratingLabel: {
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingInterval: {
    fontSize: 10,
  },
});
