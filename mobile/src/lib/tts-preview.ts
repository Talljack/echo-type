/**
 * TTS preview player — plays a short sample of a voice/speed combination.
 * Dispatches on voice source: Edge voices use cloud synthesis + expo-av playback;
 * device voices use expo-speech directly. Singleton semantics across both paths.
 */
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { cacheAudio, getCachedAudio } from '@/lib/audio-cache';
import { getVoiceSource } from '@/lib/tts/voices';
import { convertEdgeWordsToTimestamps, synthesizeEdgeTTS } from '@/services/tts-api';

let currentSound: Audio.Sound | null = null;
let currentMode: 'edge' | 'device' | null = null;

async function stopCurrent() {
  const mode = currentMode;
  currentMode = null;
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // already unloaded
    }
    currentSound = null;
  }
  if (mode === 'device') {
    try {
      await Speech.stop();
    } catch {
      // nothing was playing
    }
  }
}

export interface PreviewOptions {
  text: string;
  voice: string;
  speed?: number;
  onFinish?: () => void;
}

async function previewEdge({ text, voice, speed = 1.0, onFinish }: PreviewOptions): Promise<void> {
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
  currentMode = 'edge';
}

async function previewDevice({ text, voice, speed = 1.0, onFinish }: PreviewOptions): Promise<void> {
  currentMode = 'device';
  Speech.speak(text, {
    voice,
    rate: speed,
    onDone: () => {
      onFinish?.();
      currentMode = null;
    },
    onStopped: () => {
      currentMode = null;
    },
    onError: () => {
      currentMode = null;
    },
  });
}

export async function previewTTS(options: PreviewOptions): Promise<void> {
  await stopCurrent();
  if (getVoiceSource(options.voice) === 'edge') {
    await previewEdge(options);
  } else {
    await previewDevice(options);
  }
}

export async function stopPreview(): Promise<void> {
  await stopCurrent();
}
