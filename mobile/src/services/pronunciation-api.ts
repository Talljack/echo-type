export interface PronunciationPhoneme {
  phoneme: string;
  score: number;
  suggestion?: string;
}

export interface PronunciationWord {
  word: string;
  score: number;
  phonemes?: PronunciationPhoneme[];
}

export interface PronunciationResult {
  provider: 'speechsuper' | 'ai';
  overallScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: PronunciationWord[];
  tips: string[];
}

export interface PronunciationAPIResponse {
  status: 'success' | 'error';
  result?: {
    overall: number;
    fluency: number;
    integrity: number;
    words: Array<{
      word: string;
      quality_score: number;
      phonemes?: Array<{
        phoneme: string;
        quality_score: number;
      }>;
    }>;
  };
  error?: string;
}

/**
 * Call the web API to assess pronunciation
 */
export async function assessPronunciation(
  audioUri: string,
  referenceText: string,
  appKey: string,
  secretKey: string,
): Promise<PronunciationResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  // Read audio file
  const response = await fetch(audioUri);
  const audioBlob = await response.blob();

  // Create form data
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('referenceText', referenceText);
  formData.append('appKey', appKey);
  formData.append('secretKey', secretKey);

  // Call API
  const apiResponse = await fetch(`${apiUrl}/api/pronunciation`, {
    method: 'POST',
    body: formData,
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.json();
    throw new Error(error.error || 'Pronunciation assessment failed');
  }

  const data: PronunciationAPIResponse = await apiResponse.json();

  if (data.status !== 'success' || !data.result) {
    throw new Error(data.error || 'No result from pronunciation API');
  }

  // Parse response
  return parsePronunciationResponse(data);
}

/**
 * Parse API response into our format
 */
function parsePronunciationResponse(data: PronunciationAPIResponse): PronunciationResult {
  if (!data.result) {
    throw new Error('No result in response');
  }

  const r = data.result;

  const words: PronunciationWord[] = (r.words ?? []).map((w) => ({
    word: w.word,
    score: Math.round(w.quality_score),
    phonemes: w.phonemes?.map((p) => ({
      phoneme: p.phoneme,
      score: Math.round(p.quality_score),
      suggestion: getPhonemeHint(p.phoneme, p.quality_score),
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

/**
 * Phoneme pronunciation hints
 */
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

function getPhonemeHint(phoneme: string, score: number): string | undefined {
  if (score >= 80) return undefined;
  return PHONEME_TIPS[phoneme];
}

/**
 * Simple fallback pronunciation scoring (word-based)
 * Used when SpeechSuper API is unavailable
 */
export function calculateSimplePronunciationScore(expectedText: string, recognizedText: string): PronunciationResult {
  const expectedWords = expectedText.toLowerCase().split(/\s+/);
  const recognizedWords = recognizedText.toLowerCase().split(/\s+/);

  let correctWords = 0;
  const words: PronunciationWord[] = [];

  for (let i = 0; i < expectedWords.length; i++) {
    const expected = expectedWords[i];
    const recognized = recognizedWords[i] || '';
    const isCorrect = expected === recognized;

    if (isCorrect) correctWords++;

    words.push({
      word: expected,
      score: isCorrect ? 100 : 0,
    });
  }

  const accuracy = expectedWords.length > 0 ? (correctWords / expectedWords.length) * 100 : 0;
  const completeness =
    recognizedWords.length >= expectedWords.length ? 100 : (recognizedWords.length / expectedWords.length) * 100;
  const fluency = recognizedWords.length <= expectedWords.length * 1.2 ? 100 : 80;

  return {
    provider: 'ai',
    overallScore: Math.round(accuracy * 0.5 + completeness * 0.3 + fluency * 0.2),
    fluencyScore: Math.round(fluency),
    completenessScore: Math.round(completeness),
    words,
    tips: accuracy < 70 ? ['Practice pronouncing each word clearly'] : [],
  };
}
