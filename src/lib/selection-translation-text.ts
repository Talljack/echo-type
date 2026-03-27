export interface SelectionTextPayload {
  displayText: string;
  speechText: string;
  favoriteText: string;
}

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function tidySentenceSpacing(text: string): string {
  return text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksReasonableSentence(candidate: string): boolean {
  if (!candidate) return false;
  if (candidate.includes('=')) return false;
  if (!/[A-Za-z0-9]/.test(candidate)) return false;

  const opens = (candidate.match(/\(/g) || []).length;
  const closes = (candidate.match(/\)/g) || []).length;
  if (opens !== closes) return false;

  return true;
}

export function sanitizeSelectionSentence(rawText: string): string {
  const normalized = normalizeWhitespace(rawText);
  if (!normalized.includes('=')) {
    return tidySentenceSpacing(normalized);
  }

  const cleaned = tidySentenceSpacing(
    normalized.replace(/\s*\(\s*=\s*[^)]*\)/g, '').replace(/\s*=\s+[A-Za-z][^,.;:!?)]*/g, ''),
  );

  return looksReasonableSentence(cleaned) ? cleaned : tidySentenceSpacing(normalized);
}

export function buildSelectionTextPayload(contextText: string | undefined, selectedText: string): SelectionTextPayload {
  const fallbackText = normalizeWhitespace(selectedText);
  const sourceText = contextText?.trim() ? contextText : fallbackText;
  const displayText = sanitizeSelectionSentence(sourceText);

  return {
    displayText,
    speechText: displayText,
    favoriteText: fallbackText || displayText,
  };
}
