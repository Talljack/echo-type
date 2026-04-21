import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Appbar, Button, Card, IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import type { RatingIntervalsMap } from '@/components/practice/PracticeCompletionSummary';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { LiveFeedbackText } from '@/components/read/LiveFeedbackText';
import { ReadAloudFloatingBar } from '@/components/read/ReadAloudFloatingBar';
import { ReadableText } from '@/components/read/ReadableText';
import { ReadStatsCard } from '@/components/read/ReadStatsCard';
import { DetailedScoreCard } from '@/components/speak/DetailedScoreCard';
import { PronunciationTips } from '@/components/speak/PronunciationTips';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useReadAloudTts } from '@/hooks/useReadAloudTts';
import { previewRatings, Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import {
  buildWordToSentenceMap,
  estimateSentenceIndexFromProgress,
  sentenceCharWeights,
  splitIntoSentenceSpans,
} from '@/lib/listen-sentences';
import { buildProgressiveWordResults, compareWords, type WordResult } from '@/lib/read-feedback';
import {
  assessPronunciation,
  calculateSimplePronunciationScore,
  type PronunciationResult,
} from '@/services/pronunciation-api';
import { type SentenceTranslation, translateText } from '@/services/translation-api';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useReadStore } from '@/stores/useReadStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

const STT_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  it: 'it-IT',
  ru: 'ru-RU',
};

function getSTTLocale(lang?: string): string {
  if (!lang) return 'en-US';
  const key = lang.split('-')[0].toLowerCase();
  return STT_LOCALE_MAP[key] ?? `${key}-${key.toUpperCase()}`;
}

function normalizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9'-]/g, ''))
    .filter(Boolean);
}

function toRatingIntervalsMap(preview: ReturnType<typeof previewRatings>): {
  [Rating.Again]: string;
  [Rating.Hard]: string;
  [Rating.Good]: string;
  [Rating.Easy]: string;
} {
  return {
    [Rating.Again]: preview[Rating.Again].interval,
    [Rating.Hard]: preview[Rating.Hard].interval,
    [Rating.Good]: preview[Rating.Good].interval,
    [Rating.Easy]: preview[Rating.Easy].interval,
  };
}

export default function ReadPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();
  const { colors, getModuleColors } = useAppTheme();
  const readColors = getModuleColors('read');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const settings = useSettingsStore((state) => state.settings);
  const { t } = useI18n();
  const { startSession, endSession, showTranslation, setShowTranslation } = useReadStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<RatingIntervalsMap | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isAnalyzingPronunciation, setIsAnalyzingPronunciation] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null);

  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [sentenceTranslations, setSentenceTranslations] = useState<SentenceTranslation[] | null>(null);

  const transcriptRef = useRef('');
  const micPulse = useRef(new Animated.Value(1)).current;
  const micPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wordOffsetRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const {
    isSpeaking,
    activeWordIndex,
    progress,
    speak: speakText,
    stop: stopTts,
  } = useReadAloudTts({
    ttsVoice: settings.ttsVoice,
    ttsSpeed: settings.ttsSpeed,
  });

  const referenceWords = useMemo(() => normalizeWords(content?.text ?? ''), [content?.text]);
  const sentenceSpans = useMemo(() => splitIntoSentenceSpans(content?.text ?? ''), [content?.text]);

  const sentenceMeta = useMemo(() => {
    if (!content) {
      return {
        weights: [] as number[],
        sentenceRanges: [] as Array<{ startWordIndex: number; endWordIndex: number; text: string }>,
      };
    }

    const words = (content.text ?? '').split(/\s+/).filter(Boolean);
    const spans = splitIntoSentenceSpans(content.text ?? '');
    const wordToSentence = buildWordToSentenceMap(content.text ?? '', words, spans);

    const sentenceRanges = spans.map((span, index) => {
      const indices = words
        .map((_, wordIndex) => (wordToSentence.get(wordIndex) === index ? wordIndex : -1))
        .filter((value) => value >= 0);

      return {
        startWordIndex: indices[0] ?? 0,
        endWordIndex: indices[indices.length - 1] ?? indices[0] ?? 0,
        text: span.text,
      };
    });

    return {
      weights: sentenceCharWeights(spans),
      sentenceRanges,
    };
  }, [content]);

  const displayWordIndex = activeWordIndex >= 0 ? wordOffsetRef.current + activeWordIndex : -1;
  const currentSentenceIndex = useMemo(() => {
    if (displayWordIndex >= 0) {
      const rangeIndex = sentenceMeta.sentenceRanges.findIndex(
        (range) => displayWordIndex >= range.startWordIndex && displayWordIndex <= range.endWordIndex,
      );
      return rangeIndex >= 0 ? rangeIndex : 0;
    }
    if (progress > 0 && sentenceMeta.weights.length > 0) {
      return estimateSentenceIndexFromProgress(progress, sentenceMeta.weights);
    }
    return 0;
  }, [displayWordIndex, progress, sentenceMeta.sentenceRanges, sentenceMeta.weights]);

  const liveResults = useMemo(() => {
    if (!isRecording) return null;
    return buildProgressiveWordResults(referenceWords, normalizeWords(recognizedText));
  }, [isRecording, recognizedText, referenceWords]);

  const referenceTextMaxHeight = useMemo(() => {
    return Math.min(Math.max(height * 0.3, 180), 260);
  }, [height]);

  const stopMicPulse = useCallback(() => {
    micPulseLoopRef.current?.stop();
    micPulseLoopRef.current = null;
    micPulse.setValue(1);
  }, [micPulse]);

  const startMicPulse = useCallback(() => {
    stopMicPulse();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, {
          toValue: 1.12,
          duration: 560,
          useNativeDriver: true,
        }),
        Animated.timing(micPulse, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }),
      ]),
    );
    micPulseLoopRef.current = loop;
    loop.start();
  }, [micPulse, stopMicPulse]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      const now = Date.now();
      sessionStartedAtRef.current = now;
      setStartTime(now);
    }

    return () => {
      void stopTts().catch(() => {});
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      void Voice.destroy()
        .then(() => {
          Voice.removeAllListeners();
        })
        .catch(() => {});

      stopMicPulse();

      if (sessionStartedAtRef.current && content) {
        const duration = Math.floor((Date.now() - sessionStartedAtRef.current) / 1000);
        const wordsRead = content.text.split(/\s+/).filter(Boolean).length;
        endSession(duration, wordsRead);
      }
    };
  }, [content, endSession, startSession, stopMicPulse, stopTts]);

  useEffect(() => {
    transcriptRef.current = recognizedText;
  }, [recognizedText]);

  useEffect(() => {
    void Voice.isAvailable()
      .then((available) => {
        if (!available) {
          setSpeechError(t('read.speechNotAvailable'));
        }
      })
      .catch(() => {
        setSpeechError(t('read.speechNotAvailable'));
      });

    Voice.onSpeechResults = (event) => {
      const nextText = event.value?.[0] ?? '';
      setRecognizedText(nextText);
    };
    Voice.onSpeechPartialResults = (event) => {
      const nextText = event.value?.[0] ?? '';
      setRecognizedText(nextText);
    };
    Voice.onSpeechError = () => {
      setSpeechError(t('read.speechRecognitionFailed'));
      setIsRecording(false);
      stopMicPulse();
    };
    Voice.onSpeechEnd = () => {
      setIsRecording(false);
      stopMicPulse();
    };

    return () => {
      Voice.removeAllListeners();
      stopMicPulse();
    };
  }, [stopMicPulse, t]);

  const loadTranslation = useCallback(async () => {
    if (!content?.text) return;

    setTranslationLoading(true);
    setTranslationError(null);

    try {
      const translation = await translateText(content.text, settings.translationTargetLang, content.title);
      setSentenceTranslations(translation.sentenceTranslations ?? null);
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : t('read.translationFailed'));
    } finally {
      setTranslationLoading(false);
    }
  }, [content?.text, content?.title, settings.translationTargetLang, t]);

  useEffect(() => {
    if (showTranslation && !sentenceTranslations && !translationLoading && !translationError) {
      void loadTranslation();
    }
  }, [showTranslation, sentenceTranslations, translationLoading, translationError, loadTranslation]);

  const handleToggleTranslation = useCallback(() => {
    void haptics.light();
    const next = !showTranslation;
    setShowTranslation(next);
    if (next && !sentenceTranslations && !translationLoading) {
      void loadTranslation();
    }
  }, [loadTranslation, sentenceTranslations, setShowTranslation, showTranslation, translationLoading]);

  const handleToggleReadAloud = useCallback(async () => {
    if (!content?.text) return;

    void haptics.medium();

    if (isSpeaking) {
      await stopTts();
      wordOffsetRef.current = 0;
      return;
    }

    if (isRecording) {
      await Voice.stop().catch(() => {});
      setIsRecording(false);
      stopMicPulse();
    }

    setSpeechError(null);
    wordOffsetRef.current = 0;
    await speakText(content.text);
  }, [content?.text, isRecording, isSpeaking, speakText, stopMicPulse, stopTts]);

  const playSentenceAt = useCallback(
    async (index: number) => {
      if (!sentenceMeta.sentenceRanges.length) return;
      const clamped = Math.max(0, Math.min(index, sentenceMeta.sentenceRanges.length - 1));
      const sentence = sentenceMeta.sentenceRanges[clamped];
      wordOffsetRef.current = sentence.startWordIndex;
      await stopTts().catch(() => {});
      await speakText(sentence.text);
    },
    [sentenceMeta.sentenceRanges, speakText, stopTts],
  );

  const handlePrevSentence = useCallback(() => {
    void haptics.light();
    void playSentenceAt(Math.max(0, currentSentenceIndex - 1));
  }, [currentSentenceIndex, playSentenceAt]);

  const handleNextSentence = useCallback(() => {
    void haptics.light();
    void playSentenceAt(Math.min(sentenceMeta.sentenceRanges.length - 1, currentSentenceIndex + 1));
  }, [currentSentenceIndex, playSentenceAt, sentenceMeta.sentenceRanges.length]);

  const handleReset = useCallback(async () => {
    await stopTts().catch(() => {});
    await Voice.stop().catch(() => {});
    if (recording) {
      await recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    setIsRecording(false);
    stopMicPulse();
    setRecognizedText('');
    setTranscript('');
    setResults(null);
    setSpeechError(null);
    setPronunciationResult(null);
    setIsAnalyzingPronunciation(false);
    wordOffsetRef.current = 0;
  }, [recording, stopMicPulse, stopTts]);

  const finalizePractice = useCallback(
    async (audioUri: string | null, finalTranscript: string) => {
      if (!content) return;

      const normalizedRecognized = normalizeWords(finalTranscript);
      if (normalizedRecognized.length === 0) {
        setSpeechError(t('read.noSpeechDetected'));
        setResults(null);
        setPronunciationResult(null);
        return;
      }

      const nextResults = compareWords(referenceWords, normalizedRecognized);
      setResults(nextResults);
      setTranscript(finalTranscript);
      setSpeechError(null);
      setIsAnalyzingPronunciation(true);

      try {
        const appKey = process.env.EXPO_PUBLIC_SPEECHSUPER_APP_KEY;
        const secretKey = process.env.EXPO_PUBLIC_SPEECHSUPER_SECRET_KEY;

        const pronunciation =
          audioUri && appKey && secretKey
            ? await assessPronunciation(audioUri, content.text, appKey, secretKey)
            : calculateSimplePronunciationScore(content.text, finalTranscript);

        setPronunciationResult(pronunciation);
      } catch (error) {
        console.error('Pronunciation analysis failed:', error);
        setPronunciationResult(calculateSimplePronunciationScore(content.text, finalTranscript));
      } finally {
        setIsAnalyzingPronunciation(false);
      }
    },
    [content, referenceWords, t],
  );

  const handleToggleRecording = useCallback(async () => {
    if (!content) return;

    void haptics.medium();

    if (isRecording) {
      setIsRecording(false);
      stopMicPulse();
      await Voice.stop().catch(() => {});

      let audioUri: string | null = null;
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
        audioUri = recording.getURI();
      }
      setRecording(null);

      await finalizePractice(audioUri, transcriptRef.current.trim());
      return;
    }

    await stopTts().catch(() => {});
    setRecognizedText('');
    setTranscript('');
    setResults(null);
    setPronunciationResult(null);
    setSpeechError(null);

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(nextRecording);
      await Voice.start(getSTTLocale(content.language));
      setIsRecording(true);
      startMicPulse();
    } catch (error) {
      console.error('Failed to start read recording:', error);
      setSpeechError(
        error instanceof Error
          ? `${t('read.failedToStartRecording')}: ${error.message}`
          : t('read.failedToStartRecording'),
      );
      setIsRecording(false);
      stopMicPulse();
    }
  }, [content, finalizePractice, isRecording, recording, startMicPulse, stopMicPulse, stopTts, t]);

  const handleFinishReading = useCallback(() => {
    void stopTts().catch(() => {});
    void haptics.success();
    if (content) {
      const intervals = toRatingIntervalsMap(previewRatings(content.fsrsCard));
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  }, [content, stopTts]);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (content) {
        gradeContent(content.id, rating);
        router.back();
      }
    },
    [content, gradeContent],
  );

  if (!content) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text variant="headlineSmall" style={{ color: colors.onSurface }}>
            {t('common.contentNotFound')}
          </Text>
          <Button mode="contained" onPress={() => router.back()} buttonColor={readColors.primary}>
            {t('common.goBack')}
          </Button>
        </View>
      </Screen>
    );
  }

  const pronunciationScore = pronunciationResult?.overallScore ?? null;

  return (
    <Screen edges={['top']} padding={0}>
      <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
        <LinearGradient colors={readColors.gradient} style={styles.headerGradient}>
          <Appbar.Header style={styles.appbar}>
            <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
            <Appbar.Content title={content.title} titleStyle={[styles.headerTitle, styles.title]} />
          </Appbar.Header>
          <View style={styles.headerInfo}>
            <Text variant="bodyMedium" style={styles.headerMeta}>
              {t('read.readMode')}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[styles.scrollContent, isSpeaking ? styles.scrollContentWithFloatingBar : null]}
          showsVerticalScrollIndicator={false}
        >
          {!showRating ? (
            <>
              <Card style={[styles.contentCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: readColors.primary }]}>
                      {t('read.referenceText')}
                    </Text>
                    <View style={styles.headerActions}>
                      <IconButton
                        icon={showTranslation ? 'translate-off' : 'translate'}
                        size={20}
                        iconColor={showTranslation ? readColors.primary : colors.onSurfaceVariant}
                        onPress={handleToggleTranslation}
                        accessibilityLabel={showTranslation ? t('read.hideTranslation') : t('read.showTranslation')}
                      />
                      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                      <IconButton
                        icon={isSpeaking ? 'stop' : 'volume-high'}
                        size={20}
                        iconColor={isSpeaking ? readColors.primary : colors.onSurfaceVariant}
                        onPress={handleToggleReadAloud}
                        accessibilityLabel={isSpeaking ? t('read.stop') : t('read.listenAlong')}
                      />
                    </View>
                  </View>

                  <ScrollView
                    style={[styles.textContainer, { maxHeight: referenceTextMaxHeight }]}
                    contentContainerStyle={styles.textContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {isSpeaking ? (
                      <LiveFeedbackText
                        words={referenceWords}
                        ttsWordIndex={displayWordIndex}
                        isTtsPlaying={isSpeaking}
                      />
                    ) : showTranslation && sentenceTranslations && sentenceTranslations.length > 0 ? (
                      <View style={styles.translationBlocks}>
                        {sentenceTranslations.map((entry, index) => (
                          <View key={`${entry.original}-${index}`} style={styles.translationBlock}>
                            <Text variant="bodyLarge" style={[styles.originalSentence, { color: colors.onSurface }]}>
                              {entry.original}
                            </Text>
                            <Text variant="bodyMedium" style={[styles.translatedSentence, { color: colors.primary }]}>
                              {entry.translation}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ReadableText text={content.text} />
                    )}
                  </ScrollView>

                  {showTranslation && translationLoading && (
                    <View style={styles.translationState}>
                      <ActivityIndicator size="small" color={readColors.primary} />
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {t('read.translating')}
                      </Text>
                    </View>
                  )}

                  {showTranslation && translationError && (
                    <View style={styles.translationState}>
                      <Text variant="bodySmall" style={{ color: colors.error }}>
                        {translationError}
                      </Text>
                      <Button mode="text" compact onPress={() => void loadTranslation()} textColor={readColors.primary}>
                        {t('read.retry')}
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>

              {isRecording && liveResults && (
                <Card style={[styles.feedbackCard, { backgroundColor: colors.surface }]}>
                  <Card.Content>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                      {t('read.liveReadingFeedback')}
                    </Text>
                    <LiveFeedbackText results={liveResults} />
                  </Card.Content>
                </Card>
              )}

              <View style={styles.recordSection}>
                <View style={styles.recordButtons}>
                  <Animated.View style={{ transform: [{ scale: isRecording ? micPulse : 1 }] }}>
                    <IconButton
                      icon={isRecording ? 'microphone-off' : 'microphone'}
                      size={32}
                      mode="contained"
                      containerColor={isRecording ? colors.error : readColors.primary}
                      iconColor="#FFFFFF"
                      onPress={() => void handleToggleRecording()}
                      style={styles.micButton}
                      accessibilityLabel={isRecording ? t('read.stopRecording') : t('read.startRecording')}
                    />
                  </Animated.View>
                  <IconButton
                    icon="refresh"
                    size={20}
                    mode="outlined"
                    iconColor={readColors.primary}
                    onPress={() => void handleReset()}
                    accessibilityLabel={t('read.reset')}
                  />
                </View>

                {speechError && (
                  <Text variant="bodySmall" style={[styles.statusText, { color: colors.error }]}>
                    {speechError}
                  </Text>
                )}
                {isAnalyzingPronunciation && (
                  <Text variant="bodySmall" style={[styles.statusText, { color: colors.warning }]}>
                    {t('read.analyzingPronunciation')}
                  </Text>
                )}
              </View>

              {results && (
                <>
                  <ReadStatsCard results={results} />

                  <Card style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
                    <Card.Content>
                      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                        {t('read.pronunciationFeedback')}
                      </Text>
                      <LiveFeedbackText results={results} />
                    </Card.Content>
                  </Card>

                  {pronunciationResult && <DetailedScoreCard result={pronunciationResult} />}
                  {pronunciationResult && <PronunciationTips result={pronunciationResult} />}

                  {transcript ? (
                    <Card style={[styles.transcriptCard, { backgroundColor: colors.surface }]}>
                      <Card.Content>
                        <Text
                          variant="labelMedium"
                          style={[styles.transcriptLabel, { color: colors.onSurfaceVariant }]}
                        >
                          {t('read.rawTranscript')}
                        </Text>
                        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                          {transcript}
                        </Text>
                      </Card.Content>
                    </Card>
                  ) : null}
                </>
              )}

              <View style={styles.actions}>
                <Button
                  mode="contained"
                  onPress={handleFinishReading}
                  buttonColor={readColors.primary}
                  style={styles.actionButton}
                >
                  {t('read.finishReading')}
                </Button>
              </View>
            </>
          ) : (
            ratingIntervals && (
              <PracticeCompletionSummary
                module="read"
                stats={{
                  duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
                  wordsCount: content.text.split(/\s+/).filter(Boolean).length,
                  pronunciationScore: pronunciationScore ?? undefined,
                }}
                onGoBack={() => router.back()}
                ratingIntervals={ratingIntervals}
                onRate={handleRate}
              />
            )
          )}
        </ScrollView>

        {isSpeaking && (
          <ReadAloudFloatingBar
            isPlaying={isSpeaking}
            progress={progress}
            currentSentence={currentSentenceIndex}
            totalSentences={Math.max(sentenceSpans.length, sentenceMeta.sentenceRanges.length)}
            onToggle={() => void handleToggleReadAloud()}
            onPrev={handlePrevSentence}
            onNext={handleNextSentence}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  fullContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerInfo: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: fontFamily.heading,
  },
  title: {
    fontFamily: fontFamily.headingBold,
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fontFamily.body,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  scrollContentWithFloatingBar: {
    paddingBottom: 180,
  },
  contentCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fontFamily.headingBold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  textContainer: {
    minHeight: 220,
    width: '100%',
  },
  textContent: {
    paddingBottom: 4,
  },
  translationBlocks: {
    gap: 14,
  },
  translationBlock: {
    gap: 6,
  },
  originalSentence: {
    lineHeight: 28,
  },
  translatedSentence: {
    lineHeight: 24,
  },
  translationState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  feedbackCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  recordSection: {
    marginVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  recordButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  micButton: {
    width: 68,
    height: 68,
  },
  statusText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  resultsCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  transcriptCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 1,
  },
  transcriptLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 14,
  },
});
