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

/** BCP-47 locale from Edge-style voice id (e.g. en-US-AriaNeural → en-US). */
export function localeFromEdgeVoiceId(voiceId: string): string {
  const trimmed = voiceId.replace(/Neural$/i, '');
  const parts = trimmed.split('-');
  if (parts.length >= 2 && parts[0].length >= 2) {
    return `${parts[0]}-${parts[1]}`.replace(/_/g, '-');
  }
  return 'en-US';
}

/** Sentences for read-along practice (Latin and CJK end punctuation). */
export function splitIntoSentencesForPractice(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const chunks = normalized.match(/[^.!?。！？]+[.!?。！？]?/g);
  if (chunks?.length) {
    return chunks.map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return [normalized];
}

export function buildWordCharRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const re = /\S+/gu;
  for (;;) {
    const m = re.exec(text);
    if (m === null) break;
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

export function wordIndexFromCharIndex(ranges: { start: number; end: number }[], charIndex: number): number {
  if (ranges.length === 0) return -1;
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    if (charIndex >= start && charIndex < end) return i;
  }
  if (charIndex < ranges[0].start) return 0;
  return ranges.length - 1;
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
