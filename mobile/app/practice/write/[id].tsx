import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { TypingInput } from '@/components/write/TypingInput';
import { TypingStats } from '@/components/write/TypingStats';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWriteStore } from '@/stores/useWriteStore';
import { fontFamily } from '@/theme/typography';

export default function WritePracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const writeColors = getModuleColors('write');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, currentInput, setCurrentInput, incrementErrors, errors } = useWriteStore();
  const showWriteTranslation = useSettingsStore((s) => s.settings.showWriteTranslation);
  const { translation, isLoading, error, translate, clear } = useTranslation();
  const [translationExpanded, setTranslationExpanded] = useState(false);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime && content && !isComplete) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const wpm = calculateWPM();
        const accuracy = calculateAccuracy();
        endSession(accuracy, wpm, duration);
      }
    };
  }, []);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (content && currentInput.length === content.text.length) {
      setIsComplete(true);
      const duration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
      const wpm = calculateWPM();
      const accuracy = calculateAccuracy();
      endSession(accuracy, wpm, duration);

      // Show FSRS rating buttons
      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  }, [currentInput]);

  useEffect(() => {
    if (isComplete) {
      void haptics.success();
    }
  }, [isComplete]);

  useEffect(() => {
    if (!showWriteTranslation) {
      setTranslationExpanded(false);
      clear();
      return;
    }
    if (!translationExpanded) {
      clear();
      return;
    }
    if (!content?.text) return;
    void translate(content.text, 'write practice');
  }, [showWriteTranslation, translationExpanded, content?.text, translate, clear]);

  const calculateWPM = () => {
    if (!startTime || timeElapsed === 0) return 0;
    const words = currentInput.split(/\s+/).length;
    const minutes = timeElapsed / 60;
    return Math.round(words / minutes);
  };

  const calculateAccuracy = () => {
    if (!content || currentInput.length === 0) return 100;
    const totalChars = currentInput.length;
    const correctChars = totalChars - errors;
    return Math.round((correctChars / totalChars) * 100);
  };

  const handleInputChange = (text: string) => {
    setCurrentInput(text);
  };

  const handleError = () => {
    incrementErrors();
  };

  const handleTryAgain = () => {
    if (content) {
      setCurrentInput('');
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsComplete(false);
      setShowRating(false);
      setRatingIntervals(null);
      startSession(content.id);
    }
  };

  const handleRate = (rating: Rating) => {
    if (content) {
      gradeContent(content.id, rating);
      router.back();
    }
  };

  if (!content) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text variant="headlineSmall">Content not found</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient colors={writeColors.gradient} style={styles.headerGradient}>
          <Appbar.Header style={styles.appbar}>
            <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
            <Appbar.Content title={content.title} titleStyle={[styles.headerTitle, styles.title]} />
          </Appbar.Header>
        </LinearGradient>

        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Stats */}
          <TypingStats wpm={calculateWPM()} accuracy={calculateAccuracy()} timeElapsed={timeElapsed} />

          {showWriteTranslation &&
            (!translationExpanded ? (
              <Pressable
                onPress={() => setTranslationExpanded(true)}
                style={({ pressed }) => [
                  styles.translationToggleOuter,
                  { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="translate" size={18} color={colors.primary} />
                <Text variant="labelLarge" style={[styles.translationToggleLabel, { color: colors.onSurface }]}>
                  Show Translation
                </Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.translationCard,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
                ]}
              >
                <Pressable
                  onPress={() => setTranslationExpanded(false)}
                  style={({ pressed }) => [styles.translationCardHeader, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <MaterialCommunityIcons name="translate" size={18} color={colors.primary} />
                  <Text variant="labelLarge" style={[styles.translationToggleLabel, { color: colors.onSurface }]}>
                    Hide Translation
                  </Text>
                </Pressable>
                {isLoading && (
                  <View style={styles.translationLoadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}>
                      Translating...
                    </Text>
                  </View>
                )}
                {error ? (
                  <Text variant="bodySmall" style={[styles.translationBodyText, { color: colors.error }]}>
                    {error}
                  </Text>
                ) : null}
                {translation && !isLoading ? (
                  <ScrollView nestedScrollEnabled style={styles.translationScroll} showsVerticalScrollIndicator={false}>
                    <Text variant="bodyMedium" style={[styles.translationBodyText, { color: colors.onSurface }]}>
                      {translation.itemTranslation}
                    </Text>
                  </ScrollView>
                ) : null}
              </View>
            ))}

          {/* Typing Input */}
          <TypingInput
            expectedText={content.text}
            currentInput={currentInput}
            onInputChange={handleInputChange}
            onError={handleError}
          />

          {isComplete && showRating && ratingIntervals ? (
            <PracticeCompletionSummary
              module="write"
              stats={{
                duration: timeElapsed,
                accuracy: calculateAccuracy(),
                wpm: calculateWPM(),
                wordsCount: content.text.split(/\s+/).filter(Boolean).length,
                errors,
              }}
              onTryAgain={handleTryAgain}
              onGoBack={() => router.back()}
              ratingIntervals={ratingIntervals}
              onRate={handleRate}
            />
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 16,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: fontFamily.heading,
  },
  title: {
    fontFamily: fontFamily.headingBold,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  translationToggleOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginBottom: 12,
  },
  translationToggleLabel: {
    fontWeight: '600',
  },
  translationCard: {
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  translationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  translationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  translationScroll: {
    maxHeight: 120,
  },
  translationBodyText: {
    lineHeight: 22,
  },
});
