// ─── Pronunciation Assessment Types ─────────────────────────────────────────

export interface PronunciationResult {
  provider: 'speechsuper' | 'ai';
  overallScore?: number; // 0-100, only when supplied by the provider
  fluencyScore?: number;
  completenessScore?: number;
  words: PronunciationWord[];
  tips: string[];
}

export interface PronunciationWord {
  word: string;
  score?: number; // 0-100; phoneme-only responses need not include a word score
  phonemes?: PronunciationPhoneme[];
}

export interface PronunciationPhoneme {
  phoneme: string; // IPA symbol
  score: number; // 0-100
  suggestion?: string;
}

export interface PronunciationAssessmentRequest {
  audio: Blob;
  referenceText: string;
}

export interface SpeechSuperCredentials {
  appKey: string;
  secretKey: string;
}

export type PronunciationProvider = 'speechsuper' | 'ai' | 'auto';

export interface MonthlyUsage {
  count: number;
  month: string; // YYYY-MM
}
