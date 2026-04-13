// Text-to-Speech utilities
import * as Speech from 'expo-speech';

export interface TTSOptions {
  text: string;
  language?: string;
  rate?: number; // 0.5 - 2.0
  pitch?: number; // 0.5 - 2.0
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export class TTS {
  private static isSpeaking = false;

  // Speak text using Expo Speech
  static async speak(options: TTSOptions): Promise<void> {
    const { text, language = 'en-US', rate = 1.0, pitch = 1.0, onStart, onDone, onError } = options;

    try {
      TTS.isSpeaking = true;
      onStart?.();

      await Speech.speak(text, {
        language,
        rate,
        pitch,
        onStart: () => {
          TTS.isSpeaking = true;
        },
        onDone: () => {
          TTS.isSpeaking = false;
          onDone?.();
        },
        onError: (error) => {
          TTS.isSpeaking = false;
          onError?.(new Error(String(error)));
        },
      });
    } catch (error) {
      TTS.isSpeaking = false;
      onError?.(error instanceof Error ? error : new Error('TTS failed'));
    }
  }

  // Stop speaking
  static async stop(): Promise<void> {
    try {
      await Speech.stop();
      TTS.isSpeaking = false;
    } catch (error) {
      console.error('Failed to stop TTS:', error);
    }
  }

  // Pause speaking
  static async pause(): Promise<void> {
    try {
      await Speech.pause();
    } catch (error) {
      console.error('Failed to pause TTS:', error);
    }
  }

  // Resume speaking
  static async resume(): Promise<void> {
    try {
      await Speech.resume();
    } catch (error) {
      console.error('Failed to resume TTS:', error);
    }
  }

  // Check if speaking
  static getIsSpeaking(): boolean {
    return TTS.isSpeaking;
  }

  // Get available voices
  static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }
}

// Split text into sentences for word-by-word highlighting
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Split text into words
export function splitIntoWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

// Estimate word timing based on speech rate
export function estimateWordTimings(
  text: string,
  rate: number = 1.0,
): Array<{ word: string; start: number; duration: number }> {
  const words = splitIntoWords(text);
  const baseWPM = 150; // Average words per minute
  const adjustedWPM = baseWPM * rate;
  const msPerWord = (60 / adjustedWPM) * 1000;

  let currentTime = 0;
  return words.map((word) => {
    const duration = msPerWord * (word.length / 5); // Adjust for word length
    const timing = {
      word,
      start: currentTime,
      duration,
    };
    currentTime += duration;
    return timing;
  });
}
