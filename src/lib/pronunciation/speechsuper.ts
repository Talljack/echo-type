import type { PronunciationResult, PronunciationWord, SpeechSuperCredentials } from './types';

// ─── SpeechSuper API Response Types ─────────────────────────────────────────

interface SpeechSuperPhoneme {
  phoneme: string;
  quality_score: number;
  extent?: string[];
}

interface SpeechSuperWord {
  word: string;
  quality_score: number;
  phonemes?: SpeechSuperPhoneme[];
}

interface SpeechSuperResponse {
  status: string;
  result?: {
    overall: number;
    fluency: number;
    integrity: number;
    words?: SpeechSuperWord[];
    warning?: string;
  };
  error?: string;
}

// ─── Phoneme suggestion map ─────────────────────────────────────────────────

const PHONEME_TIPS: Record<string, string> = {
  θ: 'Place your tongue between your teeth and blow air out gently',
  ð: 'Place your tongue between your teeth and vibrate',
  ɹ: 'Curl your tongue back slightly without touching the roof of your mouth',
  ʒ: 'Like "sh" but with voice vibration',
  ŋ: 'Press the back of your tongue against the soft palate',
  æ: 'Open your mouth wide and spread your lips',
  ʌ: 'Relax your mouth and make a short "uh" sound',
  ɑː: 'Open your mouth wide and say "ah"',
  ɜː: 'Round your lips slightly and say "er"',
  ɪ: 'Relax your tongue and make a short "ih" sound',
};

function getSuggestion(phoneme: string, score: number): string | undefined {
  if (score >= 80) return undefined;
  return PHONEME_TIPS[phoneme];
}

// ─── Parse SpeechSuper response ─────────────────────────────────────────────

function parseResponse(data: SpeechSuperResponse): PronunciationResult {
  if (data.status !== 'success' || !data.result) {
    throw new Error(data.error || 'SpeechSuper assessment failed');
  }

  const r = data.result;

  const words: PronunciationWord[] = (r.words ?? []).map((w) => ({
    word: w.word,
    score: Math.round(w.quality_score),
    phonemes: w.phonemes?.map((p) => ({
      phoneme: p.phoneme,
      score: Math.round(p.quality_score),
      suggestion: getSuggestion(p.phoneme, p.quality_score),
    })),
  }));

  const tips: string[] = [];
  const weakPhonemes = words.flatMap((w) => w.phonemes ?? []).filter((p) => p.score < 60);
  const seen = new Set<string>();
  for (const p of weakPhonemes) {
    if (p.suggestion && !seen.has(p.phoneme)) {
      tips.push(`/${p.phoneme}/: ${p.suggestion}`);
      seen.add(p.phoneme);
    }
  }

  if (r.fluency < 60) {
    tips.push('Try to speak more smoothly without long pauses between words');
  }
  if (r.integrity < 70) {
    tips.push('Make sure to pronounce every word in the sentence');
  }

  return {
    provider: 'speechsuper',
    overallScore: Math.round(r.overall),
    fluencyScore: Math.round(r.fluency),
    completenessScore: Math.round(r.integrity),
    words,
    tips,
  };
}

// ─── Assess pronunciation via server proxy ──────────────────────────────────

export async function assessPronunciation(
  audio: Blob,
  referenceText: string,
  credentials: SpeechSuperCredentials,
): Promise<PronunciationResult> {
  const formData = new FormData();
  formData.append('audio', audio, 'recording.webm');
  formData.append('referenceText', referenceText);
  formData.append('appKey', credentials.appKey);
  formData.append('secretKey', credentials.secretKey);

  const res = await fetch('/api/pronunciation', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `SpeechSuper API error: ${res.status}`);
  }

  const data: SpeechSuperResponse = await res.json();
  return parseResponse(data);
}
