const ABBREVIATION_PLACEHOLDER = '__ECHOTYPE_SENTENCE_DOT__';

const ABBREVIATIONS = [
  'Mr.',
  'Mrs.',
  'Ms.',
  'Dr.',
  'Prof.',
  'Sr.',
  'Jr.',
  'vs.',
  'etc.',
  'a.m.',
  'p.m.',
  'e.g.',
  'i.e.',
  'U.S.',
  'U.K.',
  'U.N.',
] as const;

function _escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitSentences(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  let normalized = text;

  for (const abbreviation of ABBREVIATIONS) {
    normalized = normalized.replaceAll(abbreviation, abbreviation.replaceAll('.', ABBREVIATION_PLACEHOLDER));
  }

  normalized = normalized.replace(/\b(?:[A-Za-z]\.){2,}/g, (match) => match.replaceAll('.', ABBREVIATION_PLACEHOLDER));

  return normalized
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.replaceAll(ABBREVIATION_PLACEHOLDER, '.').trim())
    .filter(Boolean);
}
