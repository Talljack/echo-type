/**
 * TTS preview player — plays a short sample of a voice/speed combination.
 * Singleton instance so starting a new preview stops the previous one.
 */
import { Audio } from 'expo-av';
import { cacheAudio, getCachedAudio } from '@/lib/audio-cache';
import { convertEdgeWordsToTimestamps, synthesizeEdgeTTS } from '@/services/tts-api';

let currentSound: Audio.Sound | null = null;

async function stopCurrent() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // already unloaded
    }
    currentSound = null;
  }
}

export interface PreviewOptions {
  text: string;
  voice: string;
  speed?: number;
  onFinish?: () => void;
}

export async function previewTTS({ text, voice, speed = 1.0, onFinish }: PreviewOptions): Promise<void> {
  await stopCurrent();

  const cached = await getCachedAudio(text, voice, speed);
  let audioUri: string;

  if (cached) {
    audioUri = cached.audioUri;
  } else {
    const response = await synthesizeEdgeTTS({ text, voice, speed });
    const words = convertEdgeWordsToTimestamps(response.words);
    const duration = words.length > 0 ? words[words.length - 1].end : 0;
    const saved = await cacheAudio(text, voice, speed, response.audio, words, duration);
    audioUri = saved.audioUri;
  }

  const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true, rate: speed }, (status) => {
    if (status.isLoaded && status.didJustFinish) {
      onFinish?.();
      void stopCurrent();
    }
  });

  currentSound = sound;
}

export async function stopPreview(): Promise<void> {
  await stopCurrent();
}
