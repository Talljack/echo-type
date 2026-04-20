import Voice from '@react-native-voice/voice';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, IconButton, ProgressBar, Text } from 'react-native-paper';
import { AddFavoriteModal } from '@/components/favorites/AddFavoriteModal';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { LiveFeedbackText } from '@/components/read/LiveFeedbackText';
import { ReadableText } from '@/components/read/ReadableText';
import { TranslationPanel } from '@/components/read/TranslationPanel';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useReadAloudTts } from '@/hooks/useReadAloudTts';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { splitIntoSentencesForPractice } from '@/lib/tts';
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

function scoreUtterance(expectedText: string, spoken: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, '');
  const expectedWords = expectedText.split(/\s+/).filter(Boolean);
  const spokenWords = spoken.split(/\s+/).filter(Boolean);
  let correct = 0;
  expectedWords.forEach((word, i) => {
    const s = spokenWords[i];
    if (s && normalize(word) === normalize(s)) correct++;
  });
  return expectedWords.length === 0 ? 0 : Math.round((correct / expectedWords.length) * 100);
}

export default function ReadPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const readColors = getModuleColors('read');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const settings = useSettingsStore((state) => state.settings);
  const { t, tInterpolate } = useI18n();
  const { startSession, endSession, selectedText, setSelectedText, showTranslation, setShowTranslation } =
    useReadStore();

  const {
    isSpeaking,
    activeWordIndex,
    progress,
    pulseScale,
    toggle: toggleTts,
    stop: stopTts,
  } = useReadAloudTts({
    ttsVoice: settings.ttsVoice,
    ttsSpeed: settings.ttsSpeed,
  });

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);

  const feedbackWords = useMemo(() => {
    return (content?.text ?? '').split(/\s+/).filter(Boolean);
  }, [content?.text]);

  const ttsSourceText = content?.text ?? '';

  useEffect(() => {
    const initVoice = async () => {
      try {
        const available = await Voice.isAvailable();
        if (!available) {
          console.warn('Voice recognition not available on this device');
          return;
        }

        Voice.onSpeechResults = (e) => {
          if (e.value?.[0]) {
            setRecognizedText(e.value[0]);
          }
        };
        Voice.onSpeechPartialResults = (e) => {
          if (e.value?.[0]) {
            setRecognizedText(e.value[0]);
          }
        };
        Voice.onSpeechEnd = () => {
          setIsRecording(false);
        };
        Voice.onSpeechError = (e) => {
          console.warn('Speech error:', e);
          setIsRecording(false);
        };
      } catch (err) {
        console.error('Voice initialization error:', err);
      }
    };

    void initVoice();

    return () => {
      void Voice.destroy()
        .then(() => {
          Voice.removeAllListeners();
        })
        .catch((err) => {
          console.warn('Voice cleanup error:', err);
        });
    };
  }, []);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime && content) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const wordsRead = content.text.split(/\s+/).length;
        endSession(duration, wordsRead);
      }
    };
  }, []);

  useEffect(() => {
    if (practiceLayout !== 'sentence') return;
    slideX.setValue(20);
    sentenceOpacity.setValue(0.4);
    Animated.parallel([
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }),
      Animated.timing(sentenceOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sentenceIndex, practiceLayout, slideX, sentenceOpacity]);

  const handleTextSelect = (text: string) => {
    setSelectedText(text);
    setShowTranslation(true);
  };

  const handleCloseTranslation = () => {
    setShowTranslation(false);
    setSelectedText('');
  };

  const handleAddToVocabulary = (word: string, meaning: string, example?: string) => {
    setShowVocabModal(true);
  };

  const handleFinishReading = () => {
    void stopTts();
    void haptics.success();
    if (content) {
      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  };

  const handleRate = (rating: Rating) => {
    if (content) {
      gradeContent(content.id, rating);
      router.back();
    }
  };

  const scoringText = practiceLayout === 'sentence' ? currentSentence : (content?.text ?? '');

  const handleToggleRecording = async () => {
    if (!content) return;
    void haptics.medium();
    if (isSpeaking) {
      await stopTts();
    }
    if (isRecording) {
      try {
        await Voice.stop();
      } catch (err) {
        console.warn('Voice.stop error:', err);
      }
      setIsRecording(false);
      const score = scoreUtterance(scoringText, recognizedText);
      setPronunciationScore(score);
      if (practiceLayout === 'sentence') {
        setSentenceScores((prev) => {
          const next = [...prev];
          while (next.length < sentences.length) next.push(null);
          next[sentenceIndex] = score;
          return next;
        });
        if (score >= 80) void haptics.success();
        else void haptics.tap();
      }
    } else {
      setRecognizedText('');
      setPronunciationScore(null);
      const sttLocale = getSTTLocale(content.language);
      try {
        const available = await Voice.isAvailable();
        if (!available) {
          console.error('Voice recognition not available');
          return;
        }
        await Voice.start(sttLocale);
        setIsRecording(true);
      } catch (err) {
        console.error('Voice.start error:', err);
      }
    }
  };

  const onPracticeLayoutChange = useCallback(
    async (value: string) => {
      void haptics.tap();
      await stopTts();
      const next = value as PracticeLayout;
      setPracticeLayout(next);
      setRecognizedText('');
      setPronunciationScore(null);
      if (next === 'sentence' && content) {
        const sents = splitIntoSentencesForPractice(content.text);
        setSentenceIndex(0);
        setSentenceScores(sents.map(() => null));
      }
    },
    [content, stopTts],
  );

  const goNextSentence = useCallback(async () => {
    if (sentenceIndex >= sentences.length - 1) return;
    void haptics.light();
    await stopTts();
    setSentenceIndex((i) => i + 1);
    setRecognizedText('');
    setPronunciationScore(null);
  }, [sentenceIndex, sentences.length, stopTts]);

  const goPrevSentence = useCallback(async () => {
    if (sentenceIndex <= 0) return;
    void haptics.light();
    await stopTts();
    setSentenceIndex((i) => i - 1);
    setRecognizedText('');
    setPronunciationScore(null);
  }, [sentenceIndex, stopTts]);

  const handleTtsPress = useCallback(() => {
    void haptics.medium();
    void toggleTts(ttsSourceText);
  }, [toggleTts, ttsSourceText]);

  if (!content) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text variant="headlineSmall">{t('common.contentNotFound')}</Text>
          <Button mode="contained" onPress={() => router.back()}>
            {t('common.goBack')}
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} padding={0}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient colors={readColors.gradient} style={styles.headerGradient}>
          <Appbar.Header style={styles.appbar}>
            <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
            <Appbar.Content title={content.title} titleStyle={[styles.headerTitle, styles.title]} />
          </Appbar.Header>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!showRating ? (
            <>
              <View style={styles.segmentWrap}>
                <SegmentedButtons
                  value={practiceLayout}
                  onValueChange={onPracticeLayoutChange}
                  buttons={[
                    { value: 'full', label: t('read.fullText') },
                    { value: 'sentence', label: t('read.bySentence') },
                  ]}
                  style={styles.segmented}
                  theme={{
                    colors: {
                      secondaryContainer: colors.surfaceVariant,
                      onSecondaryContainer: colors.onSurface,
                    },
                  }}
                />
              </View>

              {showTranslation && selectedText && (
                <TranslationPanel
                  selectedText={selectedText}
                  targetLang={content.language === 'zh' ? 'en' : 'zh'}
                  context={content.text}
                  onClose={handleCloseTranslation}
                  onAddToVocabulary={handleAddToVocabulary}
                />
              )}

              <View style={[styles.ttsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.ttsRow}>
                  <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                    <IconButton
                      icon="volume-high"
                      mode="contained-tonal"
                      containerColor={isSpeaking ? readColors.primary : colors.surfaceVariant}
                      iconColor={isSpeaking ? colors.onPrimary : readColors.primary}
                      onPress={handleTtsPress}
                      accessibilityLabel={isSpeaking ? 'Stop read aloud' : 'Start read aloud'}
                    />
                  </Animated.View>
                  <View style={styles.ttsMeta}>
                    <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                      {isSpeaking ? t('read.playing') : t('read.readAloud')}
                    </Text>
                    <ProgressBar
                      progress={Math.min(1, Math.max(0, progress))}
                      color={readColors.primary}
                      style={styles.ttsProgress}
                    />
                  </View>
                </View>
              </View>

              {practiceLayout === 'sentence' ? (
                <Animated.View
                  style={{
                    opacity: sentenceOpacity,
                    transform: [{ translateX: slideX }],
                  }}
                >
                  <View style={[styles.sentenceCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary, marginBottom: 8 }}>
                      {tInterpolate('read.sentenceProgress', { n: sentenceIndex + 1, total: sentences.length })}
                    </Text>
                    <Text variant="bodyLarge" selectable style={[styles.sentenceBody, { color: colors.onSurface }]}>
                      {currentSentence}
                    </Text>
                  </View>
                  <LiveFeedbackText
                    words={feedbackWords}
                    recognizedWords={recognizedText.split(/\s+/).filter(Boolean)}
                    ttsWordIndex={activeWordIndex}
                    isTtsPlaying={isSpeaking}
                  />
                  <View style={styles.sentenceNav}>
                    <Button mode="outlined" onPress={goPrevSentence} disabled={sentenceIndex === 0} compact>
                      {t('read.previous')}
                    </Button>
                    <Button
                      mode="contained-tonal"
                      onPress={goNextSentence}
                      disabled={sentenceIndex >= sentences.length - 1}
                      compact
                    >
                      {t('read.nextSentence')}
                    </Button>
                  </View>
                  {sentences.some((_, i) => sentenceScores[i] != null) && (
                    <View style={styles.chipRow}>
                      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
                        {t('read.sentenceScores')}
                      </Text>
                      <View style={styles.chipWrap}>
                        {sentences.map((_, i) => {
                          const s = sentenceScores[i] ?? null;
                          return (
                            <Chip
                              key={`sc-${i}`}
                              compact
                              style={[
                                styles.scoreChip,
                                {
                                  backgroundColor:
                                    s == null
                                      ? colors.surfaceVariant
                                      : s >= 80
                                        ? colors.successLight
                                        : colors.warningLight,
                                },
                              ]}
                              textStyle={{ fontFamily: fontFamily.bodyMedium }}
                            >
                              {i + 1}: {s == null ? '—' : `${s}%`}
                            </Chip>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Animated.View>
              ) : (
                <>
                  <LiveFeedbackText
                    words={feedbackWords}
                    recognizedWords={recognizedText.split(/\s+/).filter(Boolean)}
                    ttsWordIndex={activeWordIndex}
                    isTtsPlaying={isSpeaking}
                  />
                  <ReadableText text={content.text} onTextSelect={handleTextSelect} />
                </>
              )}

              <View style={styles.recordSection}>
                <Button
                  mode={isRecording ? 'contained' : 'outlined'}
                  onPress={handleToggleRecording}
                  icon={isRecording ? 'stop' : 'microphone'}
                  buttonColor={isRecording ? readColors.primary : undefined}
                  textColor={isRecording ? '#FFFFFF' : readColors.primary}
                  style={[styles.recordButton, { borderCurve: 'continuous' }]}
                >
                  {isRecording ? t('read.stopReading') : t('read.startReading')}
                </Button>
              </View>

              {pronunciationScore !== null && (
                <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
                  <Text
                    variant="headlineSmall"
                    style={[
                      styles.scoreTitle,
                      {
                        color:
                          pronunciationScore >= 80
                            ? colors.accent
                            : pronunciationScore >= 50
                              ? '#FFB340'
                              : colors.error,
                      },
                    ]}
                  >
                    {pronunciationScore}%
                  </Text>
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                    {practiceLayout === 'sentence' ? t('read.sentencePronunciation') : t('read.score')}
                  </Text>
                </View>
              )}

              <View style={styles.actions}>
                <Button mode="contained" onPress={handleFinishReading} style={styles.actionButton}>
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
      </View>

      <AddFavoriteModal
        visible={showVocabModal}
        selectedWord={selectedText}
        context={content.text}
        onDismiss={() => setShowVocabModal(false)}
      />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  segmentWrap: {
    marginBottom: 12,
  },
  segmented: {
    borderRadius: 12,
  },
  ttsCard: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 12,
  },
  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ttsMeta: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  ttsProgress: {
    marginTop: 6,
    height: 6,
    borderRadius: 3,
  },
  sentenceCard: {
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
  },
  sentenceBody: {
    lineHeight: 28,
    fontSize: 18,
    fontFamily: fontFamily.body,
  },
  sentenceNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  chipRow: {
    marginBottom: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreChip: {
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    borderCurve: 'continuous',
  },
  recordSection: {
    marginVertical: 16,
    alignItems: 'center',
  },
  recordButton: {
    borderRadius: 14,
    minWidth: 200,
  },
  scoreCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontWeight: 'bold',
    fontSize: 48,
    marginBottom: 4,
  },
});
