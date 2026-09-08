export interface PronunciationProgress {
  id: string;
  soundId: string;
  kind: 'listening' | 'recording' | 'recognition' | 'speechsuper' | 'legacy';
  updatedAt: number;
  correct?: boolean;
  transcript?: string;
  assessment?: {
    overall?: number;
    fluency?: number;
    completeness?: number;
    phonemes: { phoneme: string; score: number }[];
  };
}
