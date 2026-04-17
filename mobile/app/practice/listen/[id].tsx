import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { CloudAudioPlayer } from '@/components/listen/CloudAudioPlayer';
import { HighlightedText } from '@/components/listen/HighlightedText';
import { TranslationOverlay } from '@/components/listen/TranslationOverlay';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { useAppTheme } from '@/contexts/ThemeContext';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

export default function ListenPracticeScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, setCurrentWordIndex, currentWordIndex } = useListenStore();
  const { settings } = useSettingsStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [replayCount, setReplayCount] = useState(0);

  // Default voice based on language
  const defaultVoice = content?.language === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-JennyNeural';

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        endSession(duration);
      }
    };
  }, []);

  const handleFinishListening = () => {
    void haptics.success();
    if (content) {
      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  };

  const handlePlaybackComplete = () => {
    setReplayCount((c) => c + 1);
  };

  const handleRate = (rating: Rating) => {
    if (content) {
      gradeContent(content.id, rating);
      router.back();
    }
  };

  const handleWordTap = (wordIndex: number) => {
    setCurrentWordIndex(wordIndex);
  };

  if (!content) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text variant="headlineSmall" style={{ color: colors.onSurface }}>
            Content not found
          </Text>
          <Button mode="contained" onPress={() => router.back()} buttonColor={listenColors.primary}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient colors={listenColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
          <Appbar.Content title={content.title} titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.headerInfo}>
          <Text variant="bodyMedium" style={styles.headerMeta}>
            {content.difficulty} • {content.language}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {!showRating ? (
          <>
            {/* Translation Toggle */}
            {settings.showListenTranslation && (
              <View style={styles.translationToggle}>
                <Button
                  mode={showTranslation ? 'contained' : 'outlined'}
                  onPress={() => setShowTranslation(!showTranslation)}
                  icon="translate"
                  compact
                >
                  {showTranslation ? 'Hide Translation' : 'Show Translation'}
                </Button>
              </View>
            )}

            {/* Translation Overlay */}
            <TranslationOverlay
              text={content.text}
              visible={showTranslation}
              onDismiss={() => setShowTranslation(false)}
            />

            {/* Audio Player */}
            <CloudAudioPlayer
              text={content.text}
              voice={defaultVoice}
              onWordChange={setCurrentWordIndex}
              onPlaybackComplete={handlePlaybackComplete}
            />

            {/* Highlighted Text */}
            <HighlightedText text={content.text} currentWordIndex={currentWordIndex} onWordTap={handleWordTap} />

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleFinishListening}
                buttonColor={listenColors.primary}
                style={styles.actionButton}
              >
                Finish Listening
              </Button>
            </View>
          </>
        ) : (
          ratingIntervals && (
            <PracticeCompletionSummary
              module="listen"
              stats={{
                duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
                wordsCount: content.text.split(/\s+/).filter(Boolean).length,
                replayCount,
              }}
              onGoBack={() => router.back()}
              ratingIntervals={ratingIntervals}
              onRate={handleRate}
            />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: fontFamily.heading,
  },
  headerInfo: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerMeta: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  translationToggle: {
    marginBottom: 12,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
