export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

function normalize(word: string): string {
  return word.replace(/[^\w']/g, '').toLowerCase();
}

/**
 * Aligns Whisper-transcribed word timestamps to the original text tokens.
 * Handles punctuation differences, contractions split by Whisper, and
 * missing/extra words via nearest-neighbor interpolation.
 */
export function matchTimestampsToText(whisperWords: WhisperWord[], originalText: string): WordTimestamp[] {
  const originalTokens = originalText.split(/\s+/).filter(Boolean);
  if (originalTokens.length === 0) return [];
  if (whisperWords.length === 0) {
    return originalTokens.map((word) => ({ word, start: 0, end: 0 }));
  }

  const result: WordTimestamp[] = [];
  let wIdx = 0;

  for (let oIdx = 0; oIdx < originalTokens.length; oIdx++) {
    const origToken = originalTokens[oIdx];
    const origNorm = normalize(origToken);

    if (wIdx >= whisperWords.length) {
      const lastTs = result.length > 0 ? result[result.length - 1] : whisperWords[whisperWords.length - 1];
      result.push({ word: origToken, start: lastTs.end, end: lastTs.end });
      continue;
    }

    const wWord = whisperWords[wIdx];
    const wNorm = normalize(wWord.word);

    if (wNorm === origNorm) {
      result.push({ word: origToken, start: wWord.start, end: wWord.end });
      wIdx++;
      continue;
    }

    // Check if Whisper split a contraction/hyphenated word into multiple tokens.
    // Try merging consecutive Whisper words to match the original token.
    let merged = wNorm;
    let mergeEnd = wIdx;
    let matched = false;
    for (let k = wIdx + 1; k < Math.min(wIdx + 4, whisperWords.length); k++) {
      merged += normalize(whisperWords[k].word);
      mergeEnd = k;
      if (merged === origNorm) {
        result.push({ word: origToken, start: wWord.start, end: whisperWords[mergeEnd].end });
        wIdx = mergeEnd + 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check if Whisper merged multiple original tokens into one.
    // Try concatenating original tokens to match the Whisper word.
    let origMerged = origNorm;
    let origMergeEnd = oIdx;
    matched = false;
    for (let k = oIdx + 1; k < Math.min(oIdx + 4, originalTokens.length); k++) {
      origMerged += normalize(originalTokens[k]);
      origMergeEnd = k;
      if (origMerged === wNorm) {
        const totalChars = originalTokens.slice(oIdx, origMergeEnd + 1).reduce((s, t) => s + t.length, 0);
        const duration = wWord.end - wWord.start;
        let charOffset = 0;
        for (let j = oIdx; j <= origMergeEnd; j++) {
          const charLen = originalTokens[j].length;
          const start = wWord.start + (charOffset / totalChars) * duration;
          const end = wWord.start + ((charOffset + charLen) / totalChars) * duration;
          if (j === oIdx) {
            result.push({ word: originalTokens[j], start, end });
          }
          charOffset += charLen;
        }
        // Push remaining tokens in the next iterations
        // Actually we need to push them now since the outer loop will advance oIdx
        for (let j = oIdx + 1; j <= origMergeEnd; j++) {
          const charLen = originalTokens[j].length;
          const prevEnd = result[result.length - 1].end;
          const end =
            wWord.start +
            ((charOffset - (origMergeEnd - j) * originalTokens[j].length + charLen) / totalChars) * duration;
          result.push({ word: originalTokens[j], start: prevEnd, end });
        }
        oIdx = origMergeEnd;
        wIdx++;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Fuzzy: use Whisper timestamp even if words don't match exactly.
    // This handles minor transcription differences.
    result.push({ word: origToken, start: wWord.start, end: wWord.end });
    wIdx++;
  }

  return result;
}

/**
 * Playback engine that synchronizes word highlighting with audio playback
 * using requestAnimationFrame and binary search on word timestamps.
 */
export class WordAlignmentPlayer {
  private timestamps: WordTimestamp[];
  private audio: HTMLAudioElement;
  private rafId: number | null = null;
  private lastIndex = -1;
  private onWordChange: (index: number) => void;
  private onWordProgress?: (progress: number) => void;

  constructor(
    audio: HTMLAudioElement,
    timestamps: WordTimestamp[],
    onWordChange: (index: number) => void,
    onWordProgress?: (progress: number) => void,
  ) {
    this.audio = audio;
    this.timestamps = timestamps;
    this.onWordChange = onWordChange;
    this.onWordProgress = onWordProgress;
  }

  start(): void {
    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastIndex = -1;
  }

  dispose(): void {
    this.stop();
  }

  private tick = (): void => {
    const currentTime = this.audio.currentTime;
    const index = this.findWordIndex(currentTime);

    if (index !== this.lastIndex) {
      this.lastIndex = index;
      this.onWordChange(index);
    }

    if (this.onWordProgress && index >= 0 && index < this.timestamps.length) {
      const w = this.timestamps[index];
      const dur = w.end - w.start;
      const progress = dur > 0 ? Math.min(1, Math.max(0, (currentTime - w.start) / dur)) : 1;
      this.onWordProgress(progress);
    }

    if (!this.audio.paused && !this.audio.ended) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  };

  /**
   * Binary search for the word at the given time position.
   * Returns the index of the word whose time range contains currentTime,
   * or the last word whose start <= currentTime.
   */
  private findWordIndex(currentTime: number): number {
    const ts = this.timestamps;
    if (ts.length === 0) return -1;
    if (currentTime < ts[0].start) return -1;
    if (currentTime >= ts[ts.length - 1].start) return ts.length - 1;

    let lo = 0;
    let hi = ts.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (ts[mid].start <= currentTime) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return hi;
  }
}

/**
 * Fetches word-level alignment timestamps from the server.
 * Returns null if alignment is unavailable (no API key, server error, etc.)
 */
export async function fetchAlignment(
  audioBlob: Blob,
  text: string,
  options?: { groqApiKey?: string; signal?: AbortSignal },
): Promise<{ words: WordTimestamp[]; duration: number } | null> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.mp3');
    formData.append('text', text);
    if (options?.groqApiKey) {
      formData.append('groqApiKey', options.groqApiKey);
    }

    const response = await fetch('/api/tts/align', {
      method: 'POST',
      body: formData,
      signal: options?.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { words: WordTimestamp[]; duration: number };
    if (!data.words || data.words.length === 0) return null;

    return data;
  } catch {
    return null;
  }
}
