import Voice from '@react-native-voice/voice';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { AddFavoriteModal } from '@/components/favorites/AddFavoriteModal';
import { Screen } from '@/components/layout/Screen';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { LiveFeedbackText } from '@/components/read/LiveFeedbackText';
import { ReadableText } from '@/components/read/ReadableText';
import { TranslationPanel } from '@/components/read/TranslationPanel';
import { useAppTheme } from '@/contexts/ThemeContext';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useReadStore } from '@/stores/useReadStore';
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

export default function ReadPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const readColors = getModuleColors('read');
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, selectedText, setSelectedText, showTranslation, setShowTranslation } =
    useReadStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);

  useEffect(() => {
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

    return () => {
      void Voice.destroy().then(() => {
        Voice.removeAllListeners();
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

  const handleToggleRecording = async () => {
    if (!content) return;
    void haptics.medium();
    if (isRecording) {
      await Voice.stop();
      setIsRecording(false);
      const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, '');
      const expectedWords = content.text.split(/\s+/).filter(Boolean);
      const spokenWords = recognizedText.split(/\s+/).filter(Boolean);
      let correct = 0;
      expectedWords.forEach((word, i) => {
        const spoken = spokenWords[i];
        if (spoken && normalize(word) === normalize(spoken)) correct++;
      });
      const score = expectedWords.length === 0 ? 0 : Math.round((correct / expectedWords.length) * 100);
      setPronunciationScore(score);
    } else {
      setRecognizedText('');
      setPronunciationScore(null);
      const sttLocale = getSTTLocale(content?.language);
      await Voice.start(sttLocale);
      setIsRecording(true);
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
        <LinearGradient colors={readColors.gradient} style={styles.headerGradient}>
          <Appbar.Header style={styles.appbar}>
            <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
            <Appbar.Content title={content.title} titleStyle={[styles.headerTitle, styles.title]} />
          </Appbar.Header>
        </LinearGradient>

        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
          {!showRating ? (
            <>
              {/* Translation Panel */}
              {showTranslation && selectedText && (
                <TranslationPanel
                  selectedText={selectedText}
                  targetLang={content.language === 'zh' ? 'en' : 'zh'}
                  context={content.text}
                  onClose={handleCloseTranslation}
                  onAddToVocabulary={handleAddToVocabulary}
                />
              )}

              {/* Live Feedback Text */}
              <LiveFeedbackText
                words={content.text.split(/\s+/)}
                recognizedWords={recognizedText.split(/\s+/).filter(Boolean)}
              />

              {/* Recording Button */}
              <View style={styles.recordSection}>
                <Button
                  mode={isRecording ? 'contained' : 'outlined'}
                  onPress={handleToggleRecording}
                  icon={isRecording ? 'stop' : 'microphone'}
                  buttonColor={isRecording ? readColors.primary : undefined}
                  textColor={isRecording ? '#FFFFFF' : readColors.primary}
                  style={[styles.recordButton, { borderCurve: 'continuous' }]}
                >
                  {isRecording ? 'Stop Reading' : 'Start Reading Aloud'}
                </Button>
              </View>

              {/* Pronunciation Score */}
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
                    Pronunciation Score
                  </Text>
                </View>
              )}

              {/* Readable Text */}
              <ReadableText text={content.text} onTextSelect={handleTextSelect} />

              <View style={styles.actions}>
                <Button mode="contained" onPress={handleFinishReading} style={styles.actionButton}>
                  Finish Reading
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

      {/* Add Vocabulary Modal */}
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
  container: {
    flex: 1,
    padding: 16,
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
