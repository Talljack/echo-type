import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { cacheAudio, getCachedAudio } from '@/lib/audio-cache';
import { WordTimestamp } from '@/lib/word-alignment';
import { convertEdgeWordsToTimestamps, synthesizeEdgeTTS } from '@/services/tts-api';

interface CloudAudioPlayerProps {
  text: string;
  voice: string;
  onWordChange?: (wordIndex: number) => void;
}

export function CloudAudioPlayer({ text, voice, onWordChange }: CloudAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const timestampsRef = useRef<WordTimestamp[]>([]);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

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
      const cached = await getCachedAudio(text, voice, speed);

      let audioUri: string;
      let words: WordTimestamp[];

      if (cached) {
        audioUri = cached.audioUri;
        words = cached.words;
      } else {
        // Fetch from API
        const response = await synthesizeEdgeTTS({ text, voice, speed });
        const edgeWords = convertEdgeWordsToTimestamps(response.words);

        // Calculate duration from last word
        const duration = edgeWords.length > 0 ? edgeWords[edgeWords.length - 1].end : 0;

        // Cache the audio
        const cachedData = await cacheAudio(text, voice, speed, response.audio, edgeWords, duration);
        audioUri = cachedData.audioUri;
        words = cachedData.words;
      }

      timestampsRef.current = words;

      // Load audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, rate: speed },
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
      if (status.isPlaying) {
        const currentTime = status.positionMillis / 1000;
        const duration = status.durationMillis / 1000;

        // Update progress
        setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);

        // Find current word
        const wordIndex = findWordIndex(currentTime);
        if (wordIndex !== currentWordIndex) {
          setCurrentWordIndex(wordIndex);
          onWordChange?.(wordIndex);
        }
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
        setProgress(0);
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
      return;
    }

    // Load audio if not loaded
    if (!soundRef.current) {
      await loadAudio();
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5];

  const handleSpeedToggle = async () => {
    const currentIndex = speedOptions.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    const newSpeed = speedOptions[nextIndex];

    setSpeed(newSpeed);

    // Reload audio with new speed
    await cleanup();
    setCurrentWordIndex(-1);
    setProgress(0);
  };

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Error message */}
      {error && (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {isLoading ? (
          <ActivityIndicator size={40} color="#6366F1" />
        ) : (
          <IconButton icon={isPlaying ? 'pause' : 'play'} size={40} onPress={handlePlay} iconColor="#6366F1" />
        )}

        <IconButton
          icon="speedometer"
          size={24}
          onPress={handleSpeedToggle}
          iconColor="#6366F1"
          style={styles.speedButton}
          disabled={isLoading || isPlaying}
        />
        <Text variant="labelSmall" style={styles.speedText}>
          {speed.toFixed(2)}x
        </Text>
      </View>

      {/* Word counter */}
      <Text variant="labelSmall" style={styles.counter}>
        {currentWordIndex >= 0 ? currentWordIndex + 1 : 0} / {totalWords} words
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
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
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedButton: {
    margin: 0,
  },
  speedText: {
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: -8,
  },
  counter: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
});
