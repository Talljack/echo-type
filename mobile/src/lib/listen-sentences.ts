export type SentenceSpan = {
  startChar: number;
  endChar: number;
  text: string;
};

/**
 * Split full text into sentence spans ending at `.`, `!`, or `?` (optionally followed by whitespace / EOF).
 */
export function splitIntoSentenceSpans(fullText: string): SentenceSpan[] {
  const text = fullText;
  if (!text.trim()) {
    return [{ startChar: 0, endChar: text.length, text: text.trim() || text }];
  }

  const spans: SentenceSpan[] = [];
  let segStart = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === '.' || ch === '!' || ch === '?') && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
      const endChar = i + 1;
      const slice = text.slice(segStart, endChar).trim();
      if (slice.length > 0) {
        spans.push({ startChar: segStart, endChar, text: slice });
      }
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      segStart = j;
      i = j - 1;
    }
  }

  if (segStart < text.length) {
    const slice = text.slice(segStart).trim();
    if (slice.length > 0) {
      spans.push({ startChar: segStart, endChar: text.length, text: slice });
    }
  }

  if (spans.length === 0) {
    return [{ startChar: 0, endChar: text.length, text: text.trim() }];
  }

  return spans;
}

function wordStartIndices(text: string, words: string[]): number[] {
  const starts: number[] = [];
  let searchFrom = 0;
  for (const w of words) {
    const idx = text.indexOf(w, searchFrom);
    if (idx === -1) break;
    starts.push(idx);
    searchFrom = idx + w.length;
    while (searchFrom < text.length && /\s/.test(text[searchFrom])) searchFrom++;
  }
  return starts;
}

/** Map each word index (same tokenization as `text.split(/\s+/).filter(Boolean)`) to a sentence index. */
export function buildWordToSentenceMap(text: string, words: string[], spans: SentenceSpan[]): Map<number, number> {
  const map = new Map<number, number>();
  if (spans.length === 0) return map;

  const starts = wordStartIndices(text, words);
  for (let wi = 0; wi < starts.length; wi++) {
    const pos = starts[wi];
    let si = spans.findIndex((s) => pos >= s.startChar && pos < s.endChar);
    if (si < 0) si = spans.length - 1;
    map.set(wi, si);
  }
  return map;
}

export function sentenceCharWeights(spans: SentenceSpan[]): number[] {
  return spans.map((s) => Math.max(1, s.endChar - s.startChar));
}

/** Estimate sentence from playback progress when word sync is not yet available. */
export function estimateSentenceIndexFromProgress(progress01: number, weights: number[]): number {
  if (weights.length === 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress01));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const target = clamped * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (acc >= target) return i;
  }
  return weights.length - 1;
}
