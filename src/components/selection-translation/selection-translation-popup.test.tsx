import { describe, expect, it, vi } from 'vitest';
import { saveSelectedPhrase } from './selection-translation-popup';

describe('saveSelectedPhrase', () => {
  it('loads journals and saves the selected text with translation and context', async () => {
    const loadJournals = vi.fn();
    const savePhrase = vi.fn().mockResolvedValue({ journalId: 'useful-phrases', turnId: 'turn-1', created: true });

    await expect(
      saveSelectedPhrase({
        loaded: false,
        loadJournals,
        savePhrase,
        text: "  It's taken.  ",
        translation: '有人了。',
        context: 'Coffee shop',
      }),
    ).resolves.toBe('added');

    expect(loadJournals).toHaveBeenCalledOnce();
    expect(savePhrase).toHaveBeenCalledWith({
      text: "It's taken.",
      translation: '有人了。',
      context: 'Coffee shop',
    });
  });

  it('reports an existing normalized phrase as already saved', async () => {
    const savePhrase = vi.fn().mockResolvedValue({ journalId: 'journal-1', turnId: 'turn-1', created: false });

    await expect(
      saveSelectedPhrase({
        loaded: true,
        loadJournals: vi.fn(),
        savePhrase,
        text: "It's taken.",
        translation: '有人了。',
      }),
    ).resolves.toBe('existing');
  });
});
