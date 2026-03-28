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
  const sourceText = contextText?.trim() ? contextText : fallbackText;
  const displayText = sanitizeSelectionSentence(sourceText);

  return {
    displayText,
    speechText: displayText,
    favoriteText: fallbackText || displayText,
  };
}

export function getSelectionTranslationText(
  payload: SelectionTextPayload,
  type: 'word' | 'phrase' | 'sentence',
): string {
  return type === 'sentence' ? payload.displayText : payload.favoriteText;
}

export function getSelectionHistoryText(payload: SelectionTextPayload, type: 'word' | 'phrase' | 'sentence'): string {
  return type === 'sentence' ? payload.displayText : payload.favoriteText;
}

export function getSelectionFavoriteText(payload: SelectionTextPayload, type: 'word' | 'phrase' | 'sentence'): string {
  return type === 'sentence' ? payload.displayText : payload.favoriteText;
}
