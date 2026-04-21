import Voice from '@react-native-voice/voice';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { LiveFeedbackText } from '@/components/read/LiveFeedbackText';
import { ReadableText } from '@/components/read/ReadableText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useReadAloudTts } from '@/hooks/useReadAloudTts';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
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
  const { t } = useI18n();
  const { startSession, endSession, showTranslation, setShowTranslation } = useReadStore();

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
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

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

  const scoringText = content?.text ?? '';

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
      setResults({ score, recognizedText });
    } else {
      setRecognizedText('');
      setPronunciationScore(null);
      setResults(null);
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

  const handleReset = () => {
    void Voice.stop().catch(() => {});
    setIsRecording(false);
    setRecognizedText('');
    setPronunciationScore(null);
    setResults(null);
  };

  const handleTtsPress = useCallback(() => {
    void haptics.medium();
    void toggleTts(ttsSourceText);
  }, [toggleTts, ttsSourceText]);

  const handleToggleTranslation = useCallback(() => {
    void haptics.light();
    setShowTranslation(!showTranslation);
  }, [showTranslation, setShowTranslation]);

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
              <Card style={[styles.contentCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={{ color: readColors.primary, fontWeight: '600' }}>
                      {t('read.referenceText')}
                    </Text>
                    <View style={styles.headerActions}>
                      <IconButton
                        icon={showTranslation ? 'translate-off' : 'translate'}
                        size={20}
                        iconColor={showTranslation ? readColors.primary : colors.onSurfaceVariant}
                        onPress={handleToggleTranslation}
                        accessibilityLabel="Toggle translation"
                      />
                      <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
                      <IconButton
                        icon={isSpeaking ? 'stop' : 'volume-high'}
                        size={20}
                        iconColor={isSpeaking ? readColors.primary : colors.onSurfaceVariant}
                        onPress={handleTtsPress}
                        accessibilityLabel={isSpeaking ? 'Stop' : 'Listen along'}
                      />
                    </View>
                  </View>

                  <View style={styles.textContainer}>
                    {isSpeaking ? (
                      <LiveFeedbackText
                        words={feedbackWords}
                        recognizedWords={[]}
                        ttsWordIndex={activeWordIndex}
                        isTtsPlaying={isSpeaking}
                      />
                    ) : showTranslation ? (
                      <View>
                        <ReadableText text={content.text} onTextSelect={() => {}} />
                        <Text variant="bodyMedium" style={[styles.translationText, { color: colors.onSurfaceVariant }]}>
                          {/* TODO: Add translation API integration */}
                          {t('read.translationPlaceholder')}
                        </Text>
                      </View>
                    ) : (
                      <ReadableText text={content.text} onTextSelect={() => {}} />
                    )}
                  </View>
                </Card.Content>
              </Card>

              {isRecording && (
                <View style={styles.liveSection}>
                  <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
                    {t('read.listening')}
                  </Text>
                  <LiveFeedbackText
                    words={feedbackWords}
                    recognizedWords={recognizedText.split(/\s+/).filter(Boolean)}
                    ttsWordIndex={-1}
                    isTtsPlaying={false}
                  />
                </View>
              )}

              <View style={styles.recordSection}>
                <View style={styles.recordButtons}>
                  <Animated.View style={{ transform: [{ scale: isRecording ? pulseScale : 1 }] }}>
                    <IconButton
                      icon={isRecording ? 'microphone-off' : 'microphone'}
                      size={32}
                      mode="contained"
                      containerColor={isRecording ? colors.error : readColors.primary}
                      iconColor="#FFFFFF"
                      onPress={handleToggleRecording}
                      style={styles.micButton}
                      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
                    />
                  </Animated.View>
                  <IconButton
                    icon="refresh"
                    size={20}
                    mode="outlined"
                    iconColor={readColors.primary}
                    onPress={handleReset}
                    accessibilityLabel="Reset"
                  />
                </View>
              </View>

              {results && (
                <Card style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ color: readColors.primary, marginBottom: 16 }}>
                      {t('read.results')}
                    </Text>
                    <View style={styles.scoreDisplay}>
                      <Text
                        variant="displayMedium"
                        style={[
                          styles.scoreValue,
                          {
                            color:
                              pronunciationScore! >= 80
                                ? colors.accent
                                : pronunciationScore! >= 50
                                  ? '#FFB340'
                                  : colors.error,
                          },
                        ]}
                      >
                        {pronunciationScore}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                        {t('read.pronunciationScore')}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  contentCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    minHeight: 200,
  },
  translationText: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  liveSection: {
    marginBottom: 16,
  },
  recordSection: {
    marginVertical: 24,
    alignItems: 'center',
  },
  recordButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  micButton: {
    width: 64,
    height: 64,
  },
  resultsCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 1,
  },
  scoreDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scoreValue: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
  },
});
