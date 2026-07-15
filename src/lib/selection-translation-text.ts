export interface SelectionTextPayload {
  displayText: string;
  speechText: string;
  favoriteText: string;
}

export function extractSentenceAroundOffsets(fullText: string, selectionStart: number, selectionEnd: number): string {
  if (!fullText) return '';

  const safeStart = Math.max(0, Math.min(selectionStart, fullText.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, fullText.length));
  let start = safeStart;
  let end = safeEnd;

  while (start > 0 && !/[.!?]/.test(fullText[start - 1]!)) start--;
  while (end < fullText.length && !/[.!?]/.test(fullText[end]!)) end++;
  if (end < fullText.length) end++;

  return normalizeWhitespace(fullText.slice(start, end));
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
  if (!/[A-Za-z0-9]/.test(candidate)) return false;

  const opens = (candidate.match(/\(/g) || []).length;
  const closes = (candidate.match(/\)/g) || []).length;
  if (opens !== closes) return false;

  return true;
}

function stripExplicitInlineExplanations(text: string): string {
  const bareExplanationPattern = /\s*=\s+[a-z][a-z'’-]*(?:\s+[a-z][a-z'’-]*)+(?=(?:\s*[).,;:!?])|$)/g;

  return tidySentenceSpacing(text.replace(/\s*\(\s*=\s*[^)]*\)/g, '').replace(bareExplanationPattern, ''));
}

export function sanitizeSelectionSentence(rawText: string): string {
  const normalized = normalizeWhitespace(rawText);
  if (!normalized.includes('=')) {
    return tidySentenceSpacing(normalized);
  }

  const cleaned = stripExplicitInlineExplanations(normalized);

  return looksReasonableSentence(cleaned) ? cleaned : tidySentenceSpacing(normalized);
}

export function buildSelectionTextPayload(contextText: string | undefined, selectedText: string): SelectionTextPayload {
  const fallbackText = normalizeWhitespace(selectedText);
  const selectedDisplayText = sanitizeSelectionSentence(fallbackText);

  return {
    displayText: selectedDisplayText,
    speechText: selectedDisplayText,
    favoriteText: selectedDisplayText,
  };
}

export function getSelectionTranslationText(
  payload: SelectionTextPayload,
  type: 'word' | 'phrase' | 'sentence',
): string {
  return payload.favoriteText;
}

export function getSelectionHistoryText(payload: SelectionTextPayload, type: 'word' | 'phrase' | 'sentence'): string {
  return payload.favoriteText;
}

export function getSelectionFavoriteText(payload: SelectionTextPayload, type: 'word' | 'phrase' | 'sentence'): string {
  return payload.favoriteText;
}
