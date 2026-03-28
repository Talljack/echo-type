import { describe, expect, it } from 'vitest';
import {
  buildSelectionTextPayload,
  getSelectionFavoriteText,
  getSelectionHistoryText,
  getSelectionTranslationText,
  sanitizeSelectionSentence,
} from '../selection-translation-text';

describe('buildSelectionTextPayload', () => {
  it('sanitizes inline explanations from selection text', () => {
    const payload = buildSelectionTextPayload(
      'Will someone take out the trash (= take it outside the house)?',
      'trash',
    );

    expect(payload.displayText).toBe('Will someone take out the trash?');
    expect(payload.speechText).toBe('Will someone take out the trash?');
    expect(payload.speechText).not.toContain('=');
    expect(payload.favoriteText).toBe('trash');
  });

  it('preserves legitimate equality content', () => {
    expect(sanitizeSelectionSentence('A = B is true.')).toBe('A = B is true.');
  });

  it('uses sanitized sentence text for translation and history lookups', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash (= take it outside the house)?', 'trash');

    expect(getSelectionTranslationText(payload, 'sentence')).toBe('Will someone take out the trash?');
    expect(getSelectionHistoryText(payload, 'sentence')).toBe('Will someone take out the trash?');
  });

  it('keeps word and phrase lookups anchored to the selected term', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash (= take it outside the house)?', 'trash');

    expect(getSelectionTranslationText(payload, 'word')).toBe('trash');
    expect(getSelectionHistoryText(payload, 'phrase')).toBe('trash');
  });

  it('uses sanitized sentence text for sentence favorites', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash (= take it outside the house)?', 'Will someone take out the trash (= take it outside the house)?');

    expect(getSelectionFavoriteText(payload, 'sentence')).toBe('Will someone take out the trash?');
    expect(getSelectionFavoriteText(payload, 'word')).toBe('Will someone take out the trash (= take it outside the house)?');
  });
});
