import { describe, expect, it } from 'vitest';
import { buildSelectionTextPayload } from '../selection-translation-text';

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
});
