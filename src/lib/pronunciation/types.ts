// ─── Pronunciation Assessment Types ─────────────────────────────────────────

export interface PronunciationResult {
  provider: 'speechsuper' | 'ai';
  overallScore: number; // 0-100
  fluencyScore: number; // 0-100
  completenessScore: number; // 0-100
  words: PronunciationWord[];
  tips: string[];
}

export interface PronunciationWord {
  word: string;
  score: number; // 0-100
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
