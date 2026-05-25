import type { SentenceTranslation } from '@/hooks/use-translation';

export interface ListenTranslationDisplayInput {
  showTranslation: boolean;
  transcriptVisible: boolean;
  translationLoading: boolean;
  translationError: string | null;
  translation: string | null;
  sentenceTranslations: SentenceTranslation[] | null;
}

export interface ListenTranslationDisplayState {
  translation: string | null;
  sentenceTranslations: SentenceTranslation[] | null;
  isLoading: boolean;
  error: string | null;
}

export function getListenTranslationDisplayState({
  showTranslation,
  transcriptVisible,
  translationLoading,
  translationError,
  translation,
  sentenceTranslations,
}: ListenTranslationDisplayInput): ListenTranslationDisplayState | null {
  if (!showTranslation || !transcriptVisible) return null;

  if (translationLoading) {
    return {
      translation: null,
      sentenceTranslations: null,
      isLoading: true,
      error: null,
    };
  }

  if (translationError) {
    return {
      translation: null,
      sentenceTranslations: null,
      isLoading: false,
      error: translationError,
    };
  }

  if (sentenceTranslations?.length || translation) {
    return {
      translation,
      sentenceTranslations,
      isLoading: false,
      error: null,
    };
  }

  return null;
}
