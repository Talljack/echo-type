import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { cacheAudio, getCachedAudio } from '@/lib/audio-cache';
import { WordTimestamp } from '@/lib/word-alignment';
import { convertEdgeWordsToTimestamps, synthesizeEdgeTTS } from '@/services/tts-api';

interface CloudAudioPlayerProps {
  text: string;
  voice: string;
  /** Playback rate for synthesis cache key and `expo-av` playback (typically 0.5–2). */
  rate: number;
  onWordChange?: (wordIndex: number) => void;
  /** Fires when a full playback reaches the end (used for session stats / replay count). */
  onPlaybackComplete?: () => void;
  /** When true, audio restarts from the beginning after each completion. */
  loop?: boolean;
  onToggleLoop?: () => void;
  /** Number of times playback has fully completed (including loop iterations). */
  replayCount?: number;
  /** Called whenever playback position updates while loaded (incl. paused scrub). */
  onPlaybackProgress?: (positionMillis: number, durationMillis: number) => void;
  /** Playing state changes (play / pause / end). */
  onPlayingChange?: (playing: boolean) => void;
}

export function CloudAudioPlayer({
  text,
  voice,
  rate,
  onWordChange,
  onPlaybackComplete,
  loop = false,
  onToggleLoop,
  replayCount = 0,
  onPlaybackProgress,
  onPlayingChange,
}: CloudAudioPlayerProps) {
  const { colors, isDark } = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const timestampsRef = useRef<WordTimestamp[]>([]);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentWordIndexRef = useRef(-1);

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await cleanup();
      if (!cancelled) {
        setCurrentWordIndex(-1);
        currentWordIndexRef.current = -1;
        setProgress(0);
        setIsPlaying(false);
        onPlayingChange?.(false);
        setError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text, voice, rate]);

  const cleanup = async () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const loadAudio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await getCachedAudio(text, voice, rate);

      let audioUri: string;
      let words: WordTimestamp[];

      if (cached) {
        audioUri = cached.audioUri;
        words = cached.words;
      } else {
        // Fetch from API
        const response = await synthesizeEdgeTTS({ text, voice, speed: rate });
        const edgeWords = convertEdgeWordsToTimestamps(response.words);

        // Calculate duration from last word
        const duration = edgeWords.length > 0 ? edgeWords[edgeWords.length - 1].end : 0;

        // Cache the audio
        const cachedData = await cacheAudio(text, voice, rate, response.audio, edgeWords, duration);
        audioUri = cachedData.audioUri;
        words = cachedData.words;
      }

      timestampsRef.current = words;

      // Load audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, rate },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      const durationMs = status.durationMillis ?? 0;
      const positionMs = status.positionMillis ?? 0;
      onPlaybackProgress?.(positionMs, durationMs);

      if (status.isPlaying) {
        const currentTime = positionMs / 1000;
        const duration = durationMs / 1000;

        // Update progress
        setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);

        // Find current word
        const wordIndex = findWordIndex(currentTime);
        if (wordIndex !== currentWordIndexRef.current) {
          currentWordIndexRef.current = wordIndex;
          setCurrentWordIndex(wordIndex);
          onWordChange?.(wordIndex);
        }
      }

      if (status.didJustFinish) {
        if (loop && soundRef.current) {
          onPlaybackComplete?.();
          void (async () => {
            try {
              await soundRef.current?.setPositionAsync(0);
              await soundRef.current?.playAsync();
            } catch {
              setIsPlaying(false);
              onPlayingChange?.(false);
            }
          })();
          return;
        }

        setIsPlaying(false);
        onPlayingChange?.(false);
        setCurrentWordIndex(-1);
        currentWordIndexRef.current = -1;
        setProgress(0);
        onPlaybackComplete?.();
      }
    }
  };

  const findWordIndex = (currentTime: number): number => {
    const ts = timestampsRef.current;
    if (ts.length === 0) return -1;
    if (currentTime < ts[0].start) return -1;
    if (currentTime >= ts[ts.length - 1].start) return ts.length - 1;

    let lo = 0;
    let hi = ts.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (ts[mid].start <= currentTime) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return hi;
  };

  const handlePlay = async () => {
    if (isLoading) return;

    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      onPlayingChange?.(false);
      return;
    }

    // Load audio if not loaded
    if (!soundRef.current) {
      await loadAudio();
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      onPlayingChange?.(true);
    }
  };

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  const progressTrackColor = isDark ? '#2C2C2E' : '#E5E7EB';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: progressTrackColor }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      {/* Error message */}
      {error && (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {onToggleLoop ? (
          <IconButton
            icon={loop ? 'repeat' : 'repeat-off'}
            size={28}
            onPress={onToggleLoop}
            iconColor={loop ? colors.primary : colors.onSurfaceSecondary}
            accessibilityLabel={loop ? 'Disable loop' : 'Enable loop'}
            style={styles.loopButton}
          />
        ) : null}
        {isLoading ? (
          <ActivityIndicator size={40} color={colors.primary} />
        ) : (
          <IconButton icon={isPlaying ? 'pause' : 'play'} size={40} onPress={handlePlay} iconColor={colors.primary} />
        )}
      </View>

      {/* Word counter */}
      <Text variant="labelSmall" style={[styles.counter, { color: colors.onSurfaceSecondary }]}>
        {currentWordIndex >= 0 ? currentWordIndex + 1 : 0} / {totalWords} words
      </Text>
      <Text variant="labelSmall" style={[styles.replayLine, { color: colors.onSurfaceSecondary }]}>
        Played {replayCount}×
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  loopButton: {
    position: 'absolute',
    left: 0,
    margin: 0,
  },
  counter: {
    textAlign: 'center',
    marginTop: 8,
  },
  replayLine: {
    textAlign: 'center',
    marginTop: 2,
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
});
