import { useCallback, useMemo, useState } from 'react';
import {
  cacheTranslation,
  getCachedTranslation,
  type SentenceTranslation,
  translateText,
} from '@/services/translation-api';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface SentenceTranslationState {
  translations: SentenceTranslation[] | null;
  isLoading: boolean;
  error: string | null;
}

export function useSentenceTranslation() {
  const [state, setState] = useState<SentenceTranslationState>({
    translations: null,
    isLoading: false,
    error: null,
  });

  const targetLang = useSettingsStore((s) => s.settings.translationTargetLang);

  const translate = useCallback(
    async (text: string, context?: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setState({ translations: null, isLoading: false, error: null });
        return null;
      }

      setState((prev) => ({
        translations: prev.translations,
        isLoading: true,
        error: null,
      }));

      try {
        const cached = await getCachedTranslation(trimmed, targetLang);
        if (cached?.sentenceTranslations?.length) {
          setState({
            translations: cached.sentenceTranslations,
            isLoading: false,
            error: null,
          });
          return cached.sentenceTranslations;
        }

        const result = await translateText(trimmed, targetLang, context);
        await cacheTranslation(trimmed, targetLang, result);
        setState({
          translations: result.sentenceTranslations ?? null,
          isLoading: false,
          error: null,
        });
        return result.sentenceTranslations ?? null;
      } catch (error) {
        setState((prev) => ({
          translations: prev.translations,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Translation failed',
        }));
        return null;
      }
    },
    [targetLang],
  );

  const clear = useCallback(() => {
    setState({ translations: null, isLoading: false, error: null });
  }, []);

  return useMemo(
    () => ({
      ...state,
      translate,
      clear,
    }),
    [state, translate, clear],
  );
}
