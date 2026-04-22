import { Platform } from 'react-native';

interface SpeechResultsPayload {
  value?: string[];
}

interface SpeechErrorPayload {
  error?: { message?: string };
}

export interface NativeVoiceModule {
  onSpeechStart?: ((event: unknown) => void) | null;
  onSpeechResults?: ((event: SpeechResultsPayload) => void) | null;
  onSpeechPartialResults?: ((event: SpeechResultsPayload) => void) | null;
  onSpeechEnd?: ((event: unknown) => void) | null;
  onSpeechError?: ((event: SpeechErrorPayload) => void) | null;
  start: (language: string) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  destroy: () => Promise<void>;
  removeAllListeners: () => void;
  isAvailable?: () => Promise<boolean>;
}

let cachedVoiceModule: NativeVoiceModule | null | undefined;

function loadNativeVoiceModule(): NativeVoiceModule | null {
  if (Platform.OS === 'web') return null;
  if (cachedVoiceModule !== undefined) return cachedVoiceModule;

  try {
    const voiceModule = require('@react-native-voice/voice') as { default?: NativeVoiceModule };
    cachedVoiceModule = voiceModule.default ?? null;
  } catch (error) {
    console.warn('Native voice module is unavailable in this runtime.', error);
    cachedVoiceModule = null;
  }

  return cachedVoiceModule;
}

export function hasNativeVoiceModule(): boolean {
  return Boolean(loadNativeVoiceModule());
}

export function getNativeVoiceModule(): NativeVoiceModule | null {
  return loadNativeVoiceModule();
}

export interface VoiceRecognitionOptions {
  language?: string;
  onStart?: () => void;
  onResult?: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

let isRecording = false;

export const VoiceRecognition = {
  async start(options: VoiceRecognitionOptions): Promise<void> {
    const voice = loadNativeVoiceModule();
    if (!voice) {
      options.onError?.(new Error('Voice recognition is not available in this runtime'));
      return;
    }

    if (isRecording) {
      await VoiceRecognition.stop();
    }

    const { language = 'en-US', onStart, onResult, onEnd, onError } = options;

    voice.onSpeechStart = () => {
      isRecording = true;
      onStart?.();
    };

    voice.onSpeechResults = (event) => {
      if (event.value?.length) {
        onResult?.(event.value[0]);
      }
    };

    voice.onSpeechEnd = () => {
      isRecording = false;
      onEnd?.();
    };

    voice.onSpeechError = (event) => {
      isRecording = false;
      onError?.(new Error(event.error?.message || 'Speech recognition error'));
    };

    try {
      await voice.start(language);
    } catch (error) {
      isRecording = false;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  },

  async stop(): Promise<void> {
    const voice = loadNativeVoiceModule();
    if (!voice) return;
    try {
      await voice.stop();
      isRecording = false;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  },

  async cancel(): Promise<void> {
    const voice = loadNativeVoiceModule();
    if (!voice) return;
    try {
      await voice.cancel();
      isRecording = false;
    } catch (error) {
      console.error('Error canceling voice recognition:', error);
    }
  },

  async destroy(): Promise<void> {
    const voice = loadNativeVoiceModule();
    if (!voice) return;
    try {
      await voice.destroy();
      isRecording = false;
      voice.removeAllListeners();
    } catch (error) {
      console.error('Error destroying voice recognition:', error);
    }
  },

  getIsRecording(): boolean {
    return isRecording;
  },
};

export interface PronunciationScore {
  accuracy: number;
  fluency: number;
  completeness: number;
  overall: number;
}

export function calculatePronunciationScore(expected: string, actual: string): PronunciationScore {
  const expectedWords = expected.toLowerCase().split(/\s+/);
  const actualWords = actual.toLowerCase().split(/\s+/);

  const matchingWords = actualWords.filter((word) => expectedWords.includes(word)).length;
  const accuracy = expectedWords.length > 0 ? (matchingWords / expectedWords.length) * 100 : 0;

  const completeness = expectedWords.length > 0 ? (actualWords.length / expectedWords.length) * 100 : 0;

  const extraWords = Math.max(0, actualWords.length - expectedWords.length);
  const fluency = Math.max(0, 100 - extraWords * 10);

  const overall = accuracy * 0.5 + completeness * 0.3 + fluency * 0.2;

  return {
    accuracy: Math.min(100, Math.round(accuracy)),
    fluency: Math.min(100, Math.round(fluency)),
    completeness: Math.min(100, Math.round(completeness)),
    overall: Math.min(100, Math.round(overall)),
  };
}
