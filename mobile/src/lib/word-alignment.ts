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
