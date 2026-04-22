import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, IconButton, Text } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { CloudAudioPlayer } from '@/components/listen/CloudAudioPlayer';
import { HighlightedText } from '@/components/listen/HighlightedText';
import { TranslationOverlay } from '@/components/listen/TranslationOverlay';
import { PracticeCompletionSummary, type RatingIntervalsMap } from '@/components/practice/PracticeCompletionSummary';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { previewRatings, Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import {
  buildWordToSentenceMap,
  estimateSentenceIndexFromProgress,
  sentenceCharWeights,
  splitIntoSentenceSpans,
} from '@/lib/listen-sentences';
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
  const { colors, getModuleColors, isDark } = useAppTheme();
  const listenColors = getModuleColors('listen');
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const contents = useLibraryStore((state) => state.contents);
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, setCurrentWordIndex, currentWordIndex } = useListenStore();
  const { settings, updateSettings } = useSettingsStore();
  const { t } = useI18n();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<RatingIntervalsMap | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [loopAudio, setLoopAudio] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [playback, setPlayback] = useState({ positionMillis: 0, durationMillis: 0 });

  const scrollRef = useRef<ScrollView>(null);
  const focusScrollRef = useRef<ScrollView>(null);
  const highlightAnchorY = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);

  const listenTextMeta = useMemo(() => {
    if (!content) {
      return { wts: new Map<number, number>(), weights: [] as number[] };
    }
    const words = content.text.split(/\s+/).filter((w) => w.length > 0);
    const spans = splitIntoSentenceSpans(content.text);
    const wts = buildWordToSentenceMap(content.text, words, spans);
    const weights = sentenceCharWeights(spans);
    return { wts, weights };
  }, [content]);

  const currentSentenceIndex = useMemo(() => {
    if (!content) return -1;
    if (currentWordIndex >= 0) {
      return listenTextMeta.wts.get(currentWordIndex) ?? 0;
    }
    if (isAudioPlaying && playback.durationMillis > 0) {
      return estimateSentenceIndexFromProgress(
        playback.positionMillis / playback.durationMillis,
        listenTextMeta.weights,
      );
    }
    return -1;
  }, [content, currentWordIndex, isAudioPlaying, playback, listenTextMeta]);

  useEffect(() => {
    if (!content) return;

    const startedAt = Date.now();
    startSession(content.id);
    setStartTime(startedAt);
    sessionStartedAtRef.current = startedAt;

    return () => {
      if (!sessionStartedAtRef.current) return;
      const duration = Math.floor((Date.now() - sessionStartedAtRef.current) / 1000);
      endSession(duration);
      sessionStartedAtRef.current = null;
    };
  }, [content, endSession, startSession]);

  const handleFinishListening = () => {
    void haptics.success();
    if (content) {
      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals({
        [Rating.Again]: intervals[Rating.Again].interval,
        [Rating.Hard]: intervals[Rating.Hard].interval,
        [Rating.Good]: intervals[Rating.Good].interval,
        [Rating.Easy]: intervals[Rating.Easy].interval,
      });
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

  const toggleFocusMode = () => {
    void haptics.light();
    setFocusMode((v) => !v);
  };

  const exitFocusMode = () => {
    void haptics.light();
    setFocusMode(false);
  };

  const toggleLoop = () => {
    void haptics.tap();
    setLoopAudio((v) => !v);
  };

  const handleSentenceScrollOffset = (offsetY: number) => {
    if (focusMode) {
      focusScrollRef.current?.scrollTo({
        y: Math.max(0, offsetY - 56),
        animated: true,
      });
      return;
    }
    scrollRef.current?.scrollTo({
      y: Math.max(0, highlightAnchorY.current + offsetY - 72),
      animated: true,
    });
  };

  const wordsCount = useMemo(() => content?.text.split(/\s+/).filter(Boolean).length ?? 0, [content?.text]);
  const estimatedDurationSeconds = Math.max(10, Math.round((wordsCount / (160 * settings.ttsSpeed)) * 60));
  const estimatedDurationLabel =
    estimatedDurationSeconds >= 60 ? `${Math.round(estimatedDurationSeconds / 60)}m` : `${estimatedDurationSeconds}s`;
  const relatedListenContent = useMemo(
    () => contents.find((item) => item.id !== content?.id && item.type === content?.type && Boolean(item.text?.trim())),
    [content?.id, content?.type, contents],
  );

  const continueCards = [
    {
      key: 'read',
      icon: 'book-open-page-variant' as const,
      title: t('listen.continueRead'),
      description: t('listen.continueReadDesc'),
      colors: ['#6D5EF7', '#4F46E5'] as const,
      onPress: () => {
        if (!content) return;
        void haptics.light();
        router.push(`/practice/read/${content.id}`);
      },
    },
    {
      key: 'speak',
      icon: 'message-processing' as const,
      title: t('listen.continueSpeak'),
      description: t('listen.continueSpeakDesc'),
      colors: listenColors.gradient,
      onPress: () => {
        if (!content) return;
        void haptics.light();
        router.push({ pathname: '/practice/speak/conversation', params: { topic: content.title } });
      },
    },
    {
      key: 'listen',
      icon: 'headphones' as const,
      title: t('listen.continueAnotherListen'),
      description: relatedListenContent?.title || t('listen.continueAnotherListenDesc'),
      colors: ['#38BDF8', '#2563EB'] as const,
      onPress: () => {
        void haptics.light();
        if (relatedListenContent) {
          router.push(`/practice/listen/${relatedListenContent.id}`);
          return;
        }
        router.push('/(tabs)/listen');
      },
    },
  ];

  if (!content) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text variant="headlineSmall" style={{ color: colors.onSurface }}>
            {t('common.contentNotFound')}
          </Text>
          <Button mode="contained" onPress={() => router.back()} buttonColor={listenColors.primary}>
            {t('common.goBack')}
          </Button>
        </View>
      </Screen>
    );
  }

  const dimBackdrop = isDark ? 'rgba(0,0,0,0.78)' : 'rgba(17, 24, 39, 0.86)';

  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
      {!focusMode && (
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
      )}

      {!focusMode ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!showRating ? (
            <>
              <View style={styles.utilityRow}>
                {settings.showListenTranslation ? (
                  <Button
                    mode={showTranslation ? 'contained' : 'outlined'}
                    onPress={() => setShowTranslation(!showTranslation)}
                    icon="translate"
                    compact
                    style={styles.utilityButton}
                  >
                    {showTranslation ? t('listen.hideTranslation') : t('listen.showTranslation')}
                  </Button>
                ) : null}
                <Button
                  mode="contained-tonal"
                  onPress={toggleFocusMode}
                  icon="eye-outline"
                  compact
                  style={styles.utilityButton}
                >
                  {t('listen.focus')}
                </Button>
              </View>

              <Card style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <View style={styles.metricRow}>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
                      ]}
                    >
                      <MaterialCommunityIcons name="clock-outline" size={18} color={listenColors.primary} />
                      <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                        {t('listen.estimatedDuration')}
                      </Text>
                      <Text variant="titleMedium" style={[styles.metricValue, { color: colors.onSurface }]}>
                        {estimatedDurationLabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
                      ]}
                    >
                      <MaterialCommunityIcons name="format-letter-case" size={18} color={listenColors.primary} />
                      <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                        {t('listen.words')}
                      </Text>
                      <Text variant="titleMedium" style={[styles.metricValue, { color: colors.onSurface }]}>
                        {wordsCount}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
                      ]}
                    >
                      <MaterialCommunityIcons name="account-voice" size={18} color={listenColors.primary} />
                      <Text variant="labelSmall" style={[styles.metricLabel, { color: colors.onSurfaceSecondary }]}>
                        {t('listen.voice')}
                      </Text>
                      <Text
                        variant="titleMedium"
                        numberOfLines={1}
                        style={[styles.metricValue, { color: colors.onSurface }]}
                      >
                        {ttsProviderLabel(settings.ttsProvider)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.voiceRow,
                      { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.voiceRowText}>
                      <Text
                        variant="labelSmall"
                        style={{ color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }}
                      >
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

                  <View style={styles.speedSection}>
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.speedSectionLabel,
                        { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium },
                      ]}
                    >
                      {t('listen.speed')}
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
                                backgroundColor: selected ? listenColors.primary : colors.surface,
                                borderColor: selected ? listenColors.primary : colors.borderLight,
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
                </Card.Content>
              </Card>

              <TranslationOverlay
                text={content.text}
                visible={showTranslation}
                onDismiss={() => setShowTranslation(false)}
              />

              <Card style={[styles.contentCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <View style={styles.contentHeader}>
                    <View style={styles.contentHeaderInfo}>
                      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                        {t('listen.referenceText')}
                      </Text>
                      <Text variant="bodySmall" style={[styles.supportingText, { color: colors.onSurfaceSecondary }]}>
                        {t('listen.referenceHint')}
                      </Text>
                    </View>
                    <View style={styles.contentHeaderActions}>
                      {settings.showListenTranslation ? (
                        <IconButton
                          icon={showTranslation ? 'translate-off' : 'translate'}
                          size={20}
                          onPress={() => setShowTranslation((value) => !value)}
                          iconColor={showTranslation ? colors.error : listenColors.primary}
                        />
                      ) : null}
                      <IconButton
                        icon="eye-outline"
                        size={20}
                        onPress={toggleFocusMode}
                        iconColor={listenColors.primary}
                      />
                    </View>
                  </View>

                  <View
                    onLayout={(e) => {
                      highlightAnchorY.current = e.nativeEvent.layout.y;
                    }}
                  >
                    <HighlightedText
                      text={content.text}
                      currentWordIndex={currentWordIndex}
                      currentSentenceIndex={currentSentenceIndex}
                      onWordTap={handleWordTap}
                      onSentenceScrollOffset={handleSentenceScrollOffset}
                    />
                  </View>
                </Card.Content>
              </Card>

              <View style={styles.actions}>
                <Button
                  mode="contained"
                  onPress={handleFinishListening}
                  buttonColor={listenColors.primary}
                  style={styles.actionButton}
                >
                  {t('listen.finishListening')}
                </Button>
              </View>

              <Card style={[styles.continueCardSection, { backgroundColor: colors.surface }]}>
                <Card.Content>
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                    {t('listen.continueLearning')}
                  </Text>
                  <View style={styles.continueList}>
                    {continueCards.map((card) => (
                      <Pressable
                        key={card.key}
                        onPress={card.onPress}
                        style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
                      >
                        <LinearGradient colors={card.colors} style={styles.continueLearningCard}>
                          <View style={[styles.continueLearningIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                            <MaterialCommunityIcons name={card.icon} size={20} color="#FFFFFF" />
                          </View>
                          <View style={styles.continueLearningText}>
                            <Text
                              style={[
                                styles.continueLearningTitle,
                                { color: '#FFFFFF', fontFamily: fontFamily.bodyMedium },
                              ]}
                            >
                              {card.title}
                            </Text>
                            <Text
                              style={[styles.continueLearningDesc, { color: 'rgba(255,255,255,0.84)' }]}
                              numberOfLines={2}
                            >
                              {card.description}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
                        </LinearGradient>
                      </Pressable>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            </>
          ) : (
            ratingIntervals && (
              <PracticeCompletionSummary
                module="listen"
                stats={{
                  duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
                  wordsCount,
                  replayCount,
                }}
                onGoBack={() => router.back()}
                ratingIntervals={ratingIntervals}
                onRate={handleRate}
              />
            )
          )}
        </ScrollView>
      ) : (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(200)}
          style={[styles.focusRoot, { backgroundColor: colors.background }]}
        >
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: dimBackdrop }]}
            onPress={exitFocusMode}
          />
          <ScrollView
            ref={focusScrollRef}
            style={styles.focusScroll}
            contentContainerStyle={styles.focusScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <HighlightedText
              text={content.text}
              currentWordIndex={currentWordIndex}
              currentSentenceIndex={currentSentenceIndex}
              onWordTap={handleWordTap}
              focusMode
              onSentenceScrollOffset={handleSentenceScrollOffset}
            />
          </ScrollView>
          <IconButton
            icon="close"
            mode="contained-tonal"
            size={26}
            onPress={exitFocusMode}
            style={[styles.focusClose, { top: insets.top + 8 }]}
            accessibilityLabel="Exit focus mode"
          />
        </Animated.View>
      )}

      {!showRating && (
        <View style={[styles.playerDock, focusMode && styles.playerDockFocus, { backgroundColor: colors.background }]}>
          <CloudAudioPlayer
            text={content.text}
            voice={settings.ttsVoice}
            rate={settings.ttsSpeed}
            onWordChange={setCurrentWordIndex}
            onPlaybackComplete={handlePlaybackComplete}
            loop={loopAudio}
            onToggleLoop={toggleLoop}
            replayCount={replayCount}
            onPlaybackProgress={(positionMillis, durationMillis) => {
              setPlayback({ positionMillis, durationMillis });
            }}
            onPlayingChange={setIsAudioPlaying}
          />
        </View>
      )}
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
    padding: 16,
    paddingBottom: 120,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  utilityButton: {
    borderRadius: 999,
  },
  overviewCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  metricLabel: {
    fontFamily: fontFamily.body,
  },
  metricValue: {
    fontFamily: fontFamily.heading,
  },
  speedSection: {
    marginTop: 6,
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 16,
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
    marginTop: 4,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
  },
  playerDock: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  playerDockFocus: {
    paddingBottom: 20,
  },
  focusRoot: {
    flex: 1,
    position: 'relative',
  },
  focusScroll: {
    flex: 1,
    zIndex: 1,
  },
  focusScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  focusClose: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
  },
  contentCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  contentHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  contentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: fontFamily.headingBold,
  },
  supportingText: {
    marginTop: 4,
    fontFamily: fontFamily.body,
  },
  continueCardSection: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  continueList: {
    gap: 12,
    marginTop: 14,
  },
  continueLearningCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  continueLearningIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLearningText: {
    flex: 1,
  },
  continueLearningTitle: {
    fontSize: 16,
  },
  continueLearningDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.body,
  },
});
