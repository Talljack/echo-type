import { describe, expect, it } from 'vitest';
import { getListenTranslationDisplayState } from './listen-translation';

describe('listen translation display state', () => {
  it('shows fetched sentence translations when translation is enabled', () => {
    const state = getListenTranslationDisplayState({
      showTranslation: true,
      transcriptVisible: true,
      translationLoading: false,
      translationError: null,
      translation: '奖励在我的手机上。',
      sentenceTranslations: [{ original: 'Rewards on my phone.', translation: '奖励在我的手机上。' }],
    });

    expect(state).toEqual({
      translation: '奖励在我的手机上。',
      sentenceTranslations: [{ original: 'Rewards on my phone.', translation: '奖励在我的手机上。' }],
      isLoading: false,
      error: null,
    });
  });

  it('hides translations when the listen transcript is hidden', () => {
    const state = getListenTranslationDisplayState({
      showTranslation: true,
      transcriptVisible: false,
      translationLoading: false,
      translationError: null,
      translation: '奖励在我的手机上。',
      sentenceTranslations: [{ original: 'Rewards on my phone.', translation: '奖励在我的手机上。' }],
    });

    expect(state).toBeNull();
  });
});
