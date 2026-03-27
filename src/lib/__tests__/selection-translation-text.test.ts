import { describe, expect, it } from 'vitest';
import { buildSelectionTextPayload, sanitizeSelectionSentence } from '../selection-translation-text';

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
});
