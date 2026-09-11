/** Compare typographic quote variants without rewriting learning materials. */
export function normalizePracticeQuotes(text: string): string {
  return text.replace(/[‘’ʼ＇]/g, "'").replace(/[“”＂]/g, '"');
}

/** Keyboard equivalents for punctuation only; letters, accents and case stay strict. */
export function normalizeTypingPunctuation(text: string): string {
  return normalizePracticeQuotes(text)
    .replace(/[！-／：-＠［-｀｛-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/。/g, '.')
    .replace(/…/g, '...');
}

export function alignPracticeTranslations(
  text: string,
  sentences: Array<{ original: string; translation: string }> | null | undefined,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const normalized = words.map(normalizePracticeQuotes);
  const ends: number[] = [];
  let offset = 0;
  for (const word of words) {
    ends.push(offset + word.length - 1);
    offset += word.length + 1;
  }
  let cursor = 0;
  return (sentences ?? []).flatMap((sentence) => {
    const target = normalizePracticeQuotes(sentence.original).split(/\s+/).filter(Boolean);
    if (!target.length) return [];
    for (let start = cursor; start <= words.length - target.length; start++) {
      if (!target.every((word, index) => normalized[start + index] === word)) continue;
      const end = start + target.length - 1;
      cursor = end + 1;
      return [{ startWordIndex: start, endWordIndex: end, endCharIndex: ends[end], translation: sentence.translation }];
    }
    return [];
  });
}
