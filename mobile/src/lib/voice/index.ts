import { Platform } from 'react-native';

// Only import Voice on native platforms
let Voice: any = null;
let SpeechResultsEvent: any;
let SpeechErrorEvent: any;
let SpeechStartEvent: any;
let SpeechEndEvent: any;

if (Platform.OS !== 'web') {
  const VoiceModule = require('@react-native-voice/voice');
  Voice = VoiceModule.default;
  SpeechResultsEvent = VoiceModule.SpeechResultsEvent;
  SpeechErrorEvent = VoiceModule.SpeechErrorEvent;
  SpeechStartEvent = VoiceModule.SpeechStartEvent;
  SpeechEndEvent = VoiceModule.SpeechEndEvent;
}

export interface VoiceRecognitionOptions {
  language?: string;
  onStart?: () => void;
  onResult?: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class VoiceRecognition {
  private static isRecording = false;
  private static currentOptions: VoiceRecognitionOptions | null = null;

  static async start(options: VoiceRecognitionOptions): Promise<void> {
    if (Platform.OS === 'web') {
      const { onError } = options;
      onError?.(new Error('Voice recognition is not supported on web'));
      return;
    }

    if (VoiceRecognition.isRecording) {
      await VoiceRecognition.stop();
    }

    VoiceRecognition.currentOptions = options;
    const { language = 'en-US', onStart, onResult, onEnd, onError } = options;

    // Set up event listeners
    Voice.onSpeechStart = (e: any) => {
      VoiceRecognition.isRecording = true;
      onStart?.();
    };

    Voice.onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        onResult?.(e.value[0]);
      }
    };

    Voice.onSpeechEnd = (e: any) => {
      VoiceRecognition.isRecording = false;
      onEnd?.();
    };

    Voice.onSpeechError = (e: any) => {
      VoiceRecognition.isRecording = false;
      onError?.(new Error(e.error?.message || 'Speech recognition error'));
    };

    try {
      await Voice.start(language);
    } catch (error) {
      VoiceRecognition.isRecording = false;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  static async stop(): Promise<void> {
    if (Platform.OS === 'web' || !Voice) return;
    try {
      await Voice.stop();
      VoiceRecognition.isRecording = false;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  static async cancel(): Promise<void> {
    if (Platform.OS === 'web' || !Voice) return;
    try {
      await Voice.cancel();
      VoiceRecognition.isRecording = false;
    } catch (error) {
      console.error('Error canceling voice recognition:', error);
    }
  }

  static async destroy(): Promise<void> {
    if (Platform.OS === 'web' || !Voice) return;
    try {
      await Voice.destroy();
      VoiceRecognition.isRecording = false;
      VoiceRecognition.currentOptions = null;
      Voice.removeAllListeners();
    } catch (error) {
      console.error('Error destroying voice recognition:', error);
    }
  }

  static getIsRecording(): boolean {
    return VoiceRecognition.isRecording;
  }
}

export interface PronunciationScore {
  accuracy: number; // 0-100
  fluency: number; // 0-100
  completeness: number; // 0-100
  overall: number; // 0-100
}

export function calculatePronunciationScore(expected: string, actual: string): PronunciationScore {
  // Simple word-based comparison
  const expectedWords = expected.toLowerCase().split(/\s+/);
  const actualWords = actual.toLowerCase().split(/\s+/);

  // Accuracy: how many words match
  const matchingWords = actualWords.filter((word) => expectedWords.includes(word)).length;
  const accuracy = expectedWords.length > 0 ? (matchingWords / expectedWords.length) * 100 : 0;

  // Completeness: how much of the expected text was spoken
  const completeness = expectedWords.length > 0 ? (actualWords.length / expectedWords.length) * 100 : 0;

  // Fluency: penalize if too many extra words
  const extraWords = Math.max(0, actualWords.length - expectedWords.length);
  const fluency = Math.max(0, 100 - extraWords * 10);

  // Overall score
  const overall = accuracy * 0.5 + completeness * 0.3 + fluency * 0.2;

  return {
    accuracy: Math.min(100, Math.round(accuracy)),
    fluency: Math.min(100, Math.round(fluency)),
    completeness: Math.min(100, Math.round(completeness)),
    overall: Math.min(100, Math.round(overall)),
  };
}
