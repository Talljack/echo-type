import {
  buildProgressiveWordResults,
  calculateStats,
  compareWords,
  type ProgressiveWordResult,
  type WordResult,
} from './levenshtein';

export function joinSpeechTranscripts(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function resolveSpeechTranscript(finalText: string, interimText: string, combinesSegments: boolean): string {
  if (combinesSegments) {
    return joinSpeechTranscripts(finalText, interimText);
  }
  return interimText.trim() || finalText.trim();
}

export function shouldShowSpeechFeedback(phase: string, transcript: string): boolean {
  return phase === 'listening' || phase === 'transcribing' || Boolean(transcript.trim());
}

export function normalizeSpeechWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

export function buildSpeechWordFeedback(
  originalText: string,
  transcript: string,
  progressive: boolean,
): Array<WordResult | ProgressiveWordResult> {
  const displayWords = originalText.split(/\s+/).filter(Boolean);
  const original = normalizeSpeechWords(originalText);
  const recognized = normalizeSpeechWords(transcript);
  const results = progressive ? buildProgressiveWordResults(original, recognized) : compareWords(original, recognized);

  let originalIndex = 0;
  return results.map((result) => {
    if (result.accuracy === 'extra') return result;
    const word = displayWords[originalIndex] ?? result.word;
    originalIndex += 1;
    return { ...result, word };
  });
}

export function calculateSpeechMatch(originalText: string, transcript: string) {
  const results = compareWords(normalizeSpeechWords(originalText), normalizeSpeechWords(transcript));
  const stats = calculateStats(results);
  return {
    accuracy: stats.accuracy,
    correct: stats.correct + stats.close,
    total: stats.total,
  };
}
