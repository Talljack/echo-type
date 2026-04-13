import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { TTS } from '@/lib/tts';

interface AudioPlayerProps {
  text: string;
  language?: string;
  onWordChange?: (wordIndex: number) => void;
}

export function AudioPlayer({ text, language = 'en-US', onWordChange }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  useEffect(() => {
    return () => {
      TTS.stop();
    };
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      await TTS.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setCurrentWordIndex(0);
    setProgress(0);

    // Simulate word-by-word progression
    const baseWPM = 150;
    const adjustedWPM = baseWPM * speed;
    const msPerWord = (60 / adjustedWPM) * 1000;

    let wordIndex = 0;
    const interval = setInterval(() => {
      if (wordIndex >= totalWords) {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentWordIndex(0);
        setProgress(0);
        return;
      }

      setCurrentWordIndex(wordIndex);
      setProgress((wordIndex / totalWords) * 100);
      onWordChange?.(wordIndex);
      wordIndex++;
    }, msPerWord);

    await TTS.speak({
      text,
      language,
      rate: speed,
      onDone: () => {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentWordIndex(0);
        setProgress(0);
      },
      onError: (error) => {
        clearInterval(interval);
        setIsPlaying(false);
        console.error('TTS error:', error);
      },
    });
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5];

  const handleSpeedToggle = () => {
    const currentIndex = speedOptions.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    const newSpeed = speedOptions[nextIndex];

    setSpeed(newSpeed);
    if (isPlaying) {
      TTS.stop();
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <IconButton icon={isPlaying ? 'pause' : 'play'} size={40} onPress={handlePlay} iconColor="#6366F1" />

        <IconButton
          icon="speedometer"
          size={24}
          onPress={handleSpeedToggle}
          iconColor="#6366F1"
          style={styles.speedButton}
        />
        <Text variant="labelSmall" style={styles.speedText}>
          {speed.toFixed(2)}x
        </Text>
      </View>

      {/* Word counter */}
      <Text variant="labelSmall" style={styles.counter}>
        {currentWordIndex + 1} / {totalWords} words
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
});
