import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, IconButton, Text } from 'react-native-paper';
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

const LISTEN_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatTtsVoiceLabel(voiceId: string): string {
  const trimmed = voiceId.replace(/Neural$/i, '');
  const parts = trimmed.split('-');
  if (parts.length >= 3) {
    const locale = `${parts[0]}-${parts[1]}`;
    const name = parts.slice(2).join('-');
    return `${name} · ${locale}`;
  }
  return voiceId;
}

function ttsProviderLabel(provider: string): string {
  if (provider === 'edge') return 'Edge TTS';
  return provider;
}

export default function ListenPracticeScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, setCurrentWordIndex, currentWordIndex } = useListenStore();
  const { settings, updateSettings } = useSettingsStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [replayCount, setReplayCount] = useState(0);

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

  const handleSpeedSelect = (speed: number) => {
    if (Math.abs(speed - settings.ttsSpeed) < 0.001) return;
    void haptics.tap();
    void updateSettings({ ttsSpeed: speed });
  };

  const openVoiceSettings = () => {
    void haptics.light();
    router.push({ pathname: '/(tabs)/settings', params: { openVoice: '1' } });
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

            {/* Playback speed (iOS-style chips) */}
            <View style={styles.speedSection}>
              <Text
                variant="labelLarge"
                style={[
                  styles.speedSectionLabel,
                  { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium },
                ]}
              >
                Speed
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.speedChipsRow}
              >
                {LISTEN_SPEEDS.map((speed) => {
                  const selected = Math.abs(settings.ttsSpeed - speed) < 0.001;
                  return (
                    <Pressable
                      key={speed}
                      onPress={() => handleSpeedSelect(speed)}
                      style={({ pressed }) => [
                        styles.speedChip,
                        {
                          backgroundColor: selected ? listenColors.primary : colors.surfaceVariant,
                          borderColor: selected ? listenColors.primary : colors.border,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.speedChipLabel,
                          {
                            color: selected ? colors.onPrimary : colors.onSurface,
                            fontFamily: fontFamily.bodyMedium,
                          },
                        ]}
                      >
                        {speed === 1 ? '1x' : `${speed}x`.replace('.0', '')}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* TTS voice / engine */}
            <View style={[styles.voiceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.voiceRowText}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }}>
                  {ttsProviderLabel(settings.ttsProvider)}
                </Text>
                <Text
                  variant="bodyMedium"
                  numberOfLines={1}
                  style={{ color: colors.onSurface, fontFamily: fontFamily.bodyMedium, marginTop: 2 }}
                >
                  {formatTtsVoiceLabel(settings.ttsVoice)}
                </Text>
              </View>
              <IconButton
                icon="tune-variant"
                size={22}
                onPress={openVoiceSettings}
                iconColor={listenColors.primary}
                accessibilityLabel="Open voice settings"
              />
            </View>

            {/* Audio Player */}
            <CloudAudioPlayer
              text={content.text}
              voice={settings.ttsVoice}
              rate={settings.ttsSpeed}
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
  speedSection: {
    marginBottom: 12,
  },
  speedSectionLabel: {
    marginBottom: 8,
  },
  speedChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  speedChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  speedChipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  voiceRowText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
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
