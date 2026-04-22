import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { CompletionConfetti } from '@/components/write/CompletionConfetti';
import { TypingInput } from '@/components/write/TypingInput';
import { TypingStats } from '@/components/write/TypingStats';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from '@/hooks/useTranslation';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWriteStore } from '@/stores/useWriteStore';
import { fontFamily } from '@/theme/typography';

function totalWordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Counts fully typed words in `input` that match `expected` from the start (valid practice prefix). */
function countCompletedWords(expected: string, input: string): number {
  if (!input.length) return 0;
  let words = 0;
  let i = 0;
  const inLen = input.length;
  while (i < inLen) {
    while (i < expected.length && /\s/.test(expected[i]!)) {
      if (input[i] !== expected[i]) return words;
      i++;
    }
    if (i >= inLen) return words;
    let j = i;
    while (j < expected.length && !/\s/.test(expected[j]!)) j++;
    if (inLen < j) return words;
    if (input.slice(i, j) !== expected.slice(i, j)) return words;
    words += 1;
    i = j;
    if (i < expected.length && /\s/.test(expected[i]!)) {
      if (i >= inLen) return words;
      if (input[i] !== expected[i]) return words;
      i += 1;
    }
  }
  return words;
}

export default function WritePracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const writeColors = getModuleColors('write');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, currentInput, setCurrentInput, incrementErrors, errors } = useWriteStore();
  const showWriteTranslation = useSettingsStore((s) => s.settings.showWriteTranslation);
  const { translation, isLoading, error, translate, clear } = useTranslation();
  const { t, tInterpolate } = useI18n();
  const [translationExpanded, setTranslationExpanded] = useState(false);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);

  const totalWords = useMemo(() => (content ? totalWordCount(content.text) : 0), [content]);
  const completedWords = useMemo(
    () => (content ? countCompletedWords(content.text, currentInput) : 0),
    [content, currentInput],
  );
  const remainingWords = Math.max(0, totalWords - completedWords);

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
    if (!startTime || isComplete || isPaused) return;

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isComplete, isPaused]);

  useEffect(() => {
    if (content && currentInput.length === content.text.length) {
      setIsComplete(true);
      const duration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
      const wpm = calculateWPM();
      const accuracy = calculateAccuracy();
      endSession(accuracy, wpm, duration);

      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  }, [currentInput]);

  useEffect(() => {
    if (!isComplete) return;
    setConfettiVisible(true);
    const t = setTimeout(() => setConfettiVisible(false), 2000);
    return () => clearTimeout(t);
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

  const handlePause = () => {
    if (isComplete) return;
    void haptics.light();
    setIsPaused(true);
  };

  const handleResume = () => {
    void haptics.medium();
    setStartTime((t) => (t == null ? t : Date.now() - timeElapsed * 1000));
    setIsPaused(false);
  };

  const handleTryAgain = () => {
    if (content) {
      setCurrentInput('');
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsComplete(false);
      setShowRating(false);
      setRatingIntervals(null);
      setIsPaused(false);
      setConfettiVisible(false);
      startSession(content.id);
    }
  };

  const handleRate = (rating: Rating) => {
    if (content) {
      gradeContent(content.id, rating);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/write');
      }
    }
  };

  if (!content) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text variant="headlineSmall">{t('common.contentNotFound')}</Text>
          <Button
            mode="contained"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/write');
              }
            }}
          >
            {t('common.goBack')}
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
            <Appbar.BackAction
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/write');
                }
              }}
              color="#FFFFFF"
            />
            <Appbar.Content title={content.title} titleStyle={[styles.headerTitle, styles.title]} />
          </Appbar.Header>
        </LinearGradient>

        <View style={styles.body}>
          {confettiVisible ? (
            <View style={styles.confettiLayer} pointerEvents="none">
              <CompletionConfetti colors={colors} />
            </View>
          ) : null}

          <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
          >
            <TypingStats wpm={calculateWPM()} accuracy={calculateAccuracy()} timeElapsed={timeElapsed} />

            {!isComplete ? (
              <View style={styles.toolbar}>
                <Pressable
                  onPress={isPaused ? handleResume : handlePause}
                  style={({ pressed }) => [
                    styles.pauseButton,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Resume typing' : 'Pause typing'}
                >
                  <MaterialCommunityIcons name={isPaused ? 'play' : 'pause'} size={22} color={colors.primary} />
                </Pressable>
                <View style={styles.wordCountWrap}>
                  <Animated.Text
                    key={completedWords}
                    entering={FadeIn.duration(200)}
                    style={[styles.wordCountText, { color: colors.onSurface }]}
                  >
                    {tInterpolate('write.wordsProgress', { done: completedWords, total: totalWords })}
                  </Animated.Text>
                </View>
              </View>
            ) : null}

            {isPaused && !isComplete ? (
              <View
                style={[
                  styles.pausedBanner,
                  { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight },
                ]}
              >
                <MaterialCommunityIcons name="pause-circle-outline" size={20} color={colors.primary} />
                <Text variant="bodyMedium" style={[styles.pausedText, { color: colors.onPrimaryContainer }]}>
                  {t('write.paused')} · {remainingWords} {remainingWords === 1 ? t('write.word') : t('write.words')}{' '}
                  {t('write.remaining')}
                </Text>
              </View>
            ) : null}

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
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.translationScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text variant="bodyMedium" style={[styles.translationBodyText, { color: colors.onSurface }]}>
                        {translation.itemTranslation}
                      </Text>
                    </ScrollView>
                  ) : null}
                </View>
              ))}

            <TypingInput
              expectedText={content.text}
              currentInput={currentInput}
              onInputChange={handleInputChange}
              onError={handleError}
              disabled={isPaused || isComplete}
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
                onGoBack={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/write');
                  }
                }}
                ratingIntervals={ratingIntervals}
                onRate={handleRate}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    position: 'relative',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  wordCountWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  wordCountText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pausedText: {
    flex: 1,
    fontWeight: '600',
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
