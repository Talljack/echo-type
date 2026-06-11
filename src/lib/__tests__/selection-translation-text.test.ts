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

    expect(payload.displayText).toBe('trash');
    expect(payload.speechText).toBe('trash');
    expect(payload.speechText).not.toContain('=');
    expect(payload.favoriteText).toBe('trash');
  });

  it('preserves legitimate equality content', () => {
    expect(sanitizeSelectionSentence('A = B is true.')).toBe('A = B is true.');
  });

  it('keeps a partial sentence selection for display, translation, history, and favorites', () => {
    const payload = buildSelectionTextPayload(
      'We are running short on time, so we need to decide now.',
      'running short on time',
    );

    expect(payload.displayText).toBe('running short on time');
    expect(getSelectionTranslationText(payload, 'sentence')).toBe('running short on time');
    expect(getSelectionHistoryText(payload, 'sentence')).toBe('running short on time');
    expect(getSelectionFavoriteText(payload, 'sentence')).toBe('running short on time');
  });

  it('keeps word and phrase lookups anchored to the selected term', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash (= take it outside the house)?', 'trash');

    expect(getSelectionTranslationText(payload, 'word')).toBe('trash');
    expect(getSelectionHistoryText(payload, 'phrase')).toBe('trash');
  });

  it('sanitizes inline explanations when the full selected sentence contains them', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash (= take it outside the house)?', 'Will someone take out the trash (= take it outside the house)?');

    expect(getSelectionFavoriteText(payload, 'sentence')).toBe('Will someone take out the trash?');
    expect(getSelectionFavoriteText(payload, 'word')).toBe('Will someone take out the trash?');
  });
});
