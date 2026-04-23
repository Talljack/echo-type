import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { PracticeRecommendationSection } from '@/components/practice/PracticeRecommendationSection';
import { PracticeReferenceCard } from '@/components/practice/PracticeReferenceCard';
import { PracticeScreenHeader } from '@/components/practice/PracticeScreenHeader';
import { PracticeTranslationSection } from '@/components/practice/PracticeTranslationSection';
import { CompletionConfetti } from '@/components/write/CompletionConfetti';
import { TypingInput } from '@/components/write/TypingInput';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useReadAloudTts } from '@/hooks/useReadAloudTts';
import { useSentenceTranslation } from '@/hooks/useSentenceTranslation';
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

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function WritePracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const writeColors = getModuleColors('write');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const settings = useSettingsStore((s) => s.settings);
  const { t, tInterpolate } = useI18n();
  const { startSession, endSession, currentInput, setCurrentInput, incrementErrors, errors, resetErrors } =
    useWriteStore();
  const {
    translations,
    isLoading: translationLoading,
    error: translationError,
    translate,
    clear,
  } = useSentenceTranslation();
  const {
    isSpeaking,
    speak: speakText,
    stop: stopSpeaking,
  } = useReadAloudTts({
    ttsVoice: settings.ttsVoice,
    ttsSpeed: settings.ttsSpeed,
  });

  const [translationVisible, setTranslationVisible] = useState(settings.showWriteTranslation);
  const [practiceText, setPracticeText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [errorWords, setErrorWords] = useState<string[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const latestStateRef = useRef({
    startTime: null as number | null,
    isComplete: false,
    currentInput: '',
    errors: 0,
    practiceText: '',
    contentId: '' as string | undefined,
  });

  useEffect(() => {
    latestStateRef.current = {
      startTime,
      isComplete,
      currentInput,
      errors,
      practiceText,
      contentId: content?.id,
    };
  }, [content?.id, currentInput, errors, isComplete, practiceText, startTime]);

  useEffect(() => {
    if (content) {
      setPracticeText(content.text);
      setCurrentInput('');
      resetErrors();
      setErrorWords([]);
      setTimeElapsed(0);
      setIsComplete(false);
      setShowRating(false);
      setRatingIntervals(null);
      setIsPaused(false);
      setConfettiVisible(false);
      setIsReviewMode(false);
      startSession(content.id);
      setStartTime(null);
    }

    return () => {
      void stopSpeaking().catch(() => {});
      const latest = latestStateRef.current;
      if (latest.startTime && latest.contentId && !latest.isComplete) {
        const duration = Math.floor((Date.now() - latest.startTime) / 1000);
        const words = countCompletedWords(latest.practiceText, latest.currentInput);
        const minutes = duration / 60;
        const wpm = duration > 0 && minutes > 0 ? Math.round(words / minutes) : 0;
        const totalChars = latest.currentInput.length + latest.errors;
        const accuracy =
          latest.currentInput.length === 0 || totalChars <= 0
            ? 100
            : Math.round((latest.currentInput.length / totalChars) * 100);
        endSession(accuracy, wpm, duration);
      }
    };
  }, [content, endSession, resetErrors, setCurrentInput, startSession, stopSpeaking]);

  useEffect(() => {
    if (!startTime || isComplete || isPaused) return;

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isComplete, isPaused]);

  useEffect(() => {
    if (practiceText && currentInput.length === practiceText.length) {
      setIsComplete(true);
      const duration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
      const wpm = calculateWPM();
      const accuracy = calculateAccuracy();
      endSession(accuracy, wpm, duration);

      if (content) {
        const intervals = previewRatings(content.fsrsCard);
        setRatingIntervals(intervals);
      }
      setShowRating(true);
    }
  }, [currentInput, practiceText]);

  useEffect(() => {
    if (!isComplete) return;
    setConfettiVisible(true);
    const timer = setTimeout(() => setConfettiVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [isComplete]);

  useEffect(() => {
    if (!translationVisible) {
      clear();
      return;
    }
    if (!practiceText) return;
    void translate(practiceText, content?.title ?? 'write practice');
  }, [translationVisible, practiceText, content?.title, translate, clear]);

  const totalWords = useMemo(() => totalWordCount(practiceText), [practiceText]);
  const completedWords = useMemo(() => countCompletedWords(practiceText, currentInput), [practiceText, currentInput]);
  const remainingWords = Math.max(0, totalWords - completedWords);

  const calculateWPM = () => {
    if (!startTime || timeElapsed === 0) return 0;
    const words = completedWords;
    const minutes = timeElapsed / 60;
    return minutes > 0 ? Math.round(words / minutes) : 0;
  };

  const calculateAccuracy = () => {
    if (!currentInput.length) return 100;
    const totalChars = currentInput.length + errors;
    if (totalChars <= 0) return 100;
    const correctChars = currentInput.length;
    return Math.round((correctChars / totalChars) * 100);
  };

  const handleInputChange = (text: string) => {
    if (startTime == null && text.length > 0) {
      setStartTime(Date.now());
    }
    setCurrentInput(text);
  };

  const handleError = (word: string) => {
    incrementErrors();
    if (word) {
      setErrorWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
    }
  };

  const handlePause = () => {
    if (isComplete) return;
    void haptics.light();
    setIsPaused(true);
    void stopSpeaking().catch(() => {});
  };

  const handleResume = () => {
    void haptics.medium();
    setStartTime((value) => (value == null ? value : Date.now() - timeElapsed * 1000));
    setIsPaused(false);
  };

  const resetToText = (nextText: string, reviewMode: boolean) => {
    setCurrentInput('');
    setPracticeText(nextText);
    setStartTime(null);
    setTimeElapsed(0);
    setIsComplete(false);
    setShowRating(false);
    setRatingIntervals(null);
    setIsPaused(false);
    setConfettiVisible(false);
    setIsReviewMode(reviewMode);
    setErrorWords([]);
    resetErrors();
    if (content) {
      startSession(content.id);
    }
  };

  const handleTryAgain = () => {
    if (!content) return;
    void haptics.medium();
    resetToText(isReviewMode ? practiceText : content.text, isReviewMode);
  };

  const handleReviewErrors = () => {
    if (!errorWords.length) return;
    void haptics.light();
    resetToText(errorWords.join(' '), true);
  };

  const handleFullTextAgain = () => {
    if (!content) return;
    void haptics.light();
    resetToText(content.text, false);
  };

  const handleToggleTranslation = () => {
    void haptics.light();
    setTranslationVisible((prev) => !prev);
  };

  const handleListen = async () => {
    if (!practiceText) return;
    void haptics.light();
    if (isSpeaking) {
      await stopSpeaking();
      return;
    }
    await speakText(practiceText);
  };

  const handleReset = () => {
    if (!content) return;
    void haptics.light();
    resetToText(isReviewMode ? practiceText : content.text, isReviewMode);
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
          <PracticeScreenHeader
            title={content.title}
            subtitle={isReviewMode ? t('write.reviewErrors') : t('write.title')}
            currentModule="write"
            contentId={content.id}
            backFallbackRoute="/(tabs)/write"
          />
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
            <View style={[styles.toolbarCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.metricRow}>
                <View style={styles.metric}>
                  <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                    {t('write.time')}
                  </Text>
                  <Text variant="titleLarge" style={[styles.metricValue, { color: colors.onSurface }]}>
                    {formatElapsed(timeElapsed)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                    {t('write.accuracy')}
                  </Text>
                  <Text variant="titleLarge" style={[styles.metricValue, { color: colors.onSurface }]}>
                    {calculateAccuracy()}%
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                    {t('write.wpm')}
                  </Text>
                  <Text variant="titleLarge" style={[styles.metricValue, { color: colors.onSurface }]}>
                    {calculateWPM()}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                    {t('write.words')}
                  </Text>
                  <Text variant="titleLarge" style={[styles.metricValue, { color: colors.onSurface }]}>
                    {completedWords}/{totalWords}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={isPaused ? handleResume : handlePause}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={isPaused ? 'play' : 'pause'} size={18} color={writeColors.primary} />
                  <Text style={[styles.actionText, { color: colors.onSurface }]}>
                    {isPaused ? t('write.resume') : t('common.pause')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleToggleTranslation}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={translationVisible ? 'translate-off' : 'translate'}
                    size={18}
                    color={writeColors.primary}
                  />
                  <Text style={[styles.actionText, { color: colors.onSurface }]}>
                    {translationVisible ? t('write.hideTranslation') : t('write.showTranslation')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleListen()}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isSpeaking ? 'stop' : 'volume-high'}
                    size={18}
                    color={writeColors.primary}
                  />
                  <Text style={[styles.actionText, { color: colors.onSurface }]}>
                    {isSpeaking ? t('read.stop') : t('write.listen')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleReset}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="refresh" size={18} color={writeColors.primary} />
                  <Text style={[styles.actionText, { color: colors.onSurface }]}>{t('write.reset')}</Text>
                </Pressable>
              </View>
            </View>

            <PracticeReferenceCard title={t('write.referenceText')} titleColor={writeColors.primary}>
              <Text variant="bodySmall" style={[styles.referenceHint, { color: colors.onSurfaceSecondary }]}>
                {t('write.referenceHint')}
              </Text>
              <Text variant="bodyLarge" style={[styles.referenceText, { color: colors.onSurface }]}>
                {practiceText}
              </Text>
              {translationVisible ? (
                <PracticeTranslationSection
                  translations={translations}
                  isLoading={translationLoading}
                  error={translationError}
                  loadingLabel={t('read.translating')}
                  retryLabel={t('read.retry')}
                  onRetry={() => void translate(practiceText, content.title)}
                />
              ) : null}
            </PracticeReferenceCard>

            <View style={styles.typingSurfaceWrap}>
              <TypingInput
                expectedText={practiceText}
                currentInput={currentInput}
                onInputChange={handleInputChange}
                onError={handleError}
                disabled={isPaused || isComplete}
              />

              {!currentInput.length && !isPaused && !isComplete ? (
                <Text variant="bodyMedium" style={[styles.startHint, { color: colors.onSurfaceSecondary }]}>
                  {t('write.startHint')}
                </Text>
              ) : null}

              {isPaused && !isComplete ? (
                <View style={[styles.pauseOverlay, { backgroundColor: `${colors.surface}E6` }]}>
                  <MaterialCommunityIcons name="pause-circle-outline" size={28} color={writeColors.primary} />
                  <Text variant="headlineSmall" style={[styles.pauseTitle, { color: colors.onSurface }]}>
                    {t('write.paused')}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.pauseBody, { color: colors.onSurfaceSecondary }]}>
                    {remainingWords} {remainingWords === 1 ? t('write.word') : t('write.words')} {t('write.remaining')}
                  </Text>
                  <Button mode="contained" buttonColor={writeColors.primary} onPress={handleResume}>
                    {t('write.resume')}
                  </Button>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                    {t('write.resumeHint')}
                  </Text>
                </View>
              ) : null}
            </View>

            {isComplete && showRating && ratingIntervals ? (
              <>
                {errorWords.length > 0 ? (
                  <View
                    style={[
                      styles.errorWordsCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    ]}
                  >
                    <Text variant="titleMedium" style={[styles.errorWordsTitle, { color: colors.onSurface }]}>
                      {t('write.errorWords')}
                    </Text>
                    <View style={styles.errorWordsRow}>
                      {errorWords.map((word) => (
                        <View key={word} style={[styles.errorChip, { backgroundColor: colors.errorLight }]}>
                          <Text style={{ color: colors.error }}>{word}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.completionActionRow}>
                      {!isReviewMode ? (
                        <Button mode="contained-tonal" onPress={handleReviewErrors}>
                          {t('write.reviewErrors')}
                        </Button>
                      ) : (
                        <Button mode="contained-tonal" onPress={handleFullTextAgain}>
                          {t('write.fullTextAgain')}
                        </Button>
                      )}
                    </View>
                  </View>
                ) : null}

                <PracticeCompletionSummary
                  module="write"
                  stats={{
                    duration: timeElapsed,
                    accuracy: calculateAccuracy(),
                    wpm: calculateWPM(),
                    wordsCount: totalWordCount(practiceText),
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

                <PracticeRecommendationSection
                  title={t('practice.recommendationsTitle')}
                  emptyLabel={t('practice.recommendationsEmpty')}
                  generatingLabel={t('practice.recommendationsGenerating')}
                  retryLabel={t('read.retry')}
                  goToSettingsLabel={t('practice.goToSettings')}
                  content={content}
                  onSelect={(contentId) => {
                    void haptics.light();
                    router.replace(`/practice/write/${contentId}`);
                  }}
                />
              </>
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
    paddingBottom: 8,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  toolbarCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    minWidth: '22%',
    flexGrow: 1,
  },
  metricLabel: {
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: fontFamily.headingBold,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontFamily: fontFamily.bodyMedium,
  },
  referenceHint: {
    marginBottom: 10,
    fontFamily: fontFamily.body,
  },
  referenceText: {
    lineHeight: 30,
    fontFamily: fontFamily.body,
  },
  typingSurfaceWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  startHint: {
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  pauseTitle: {
    fontFamily: fontFamily.headingBold,
  },
  pauseBody: {
    textAlign: 'center',
  },
  errorWordsCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  errorWordsTitle: {
    fontFamily: fontFamily.headingBold,
  },
  errorWordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  errorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  completionActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
