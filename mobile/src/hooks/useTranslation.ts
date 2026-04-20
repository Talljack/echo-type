import { useCallback, useState } from 'react';
import {
  cacheTranslation,
  getCachedTranslation,
  type TranslationResult,
  translateText,
} from '@/services/translation-api';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface TranslationState {
  translation: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useTranslation() {
  const [state, setState] = useState<TranslationState>({
    translation: null,
    isLoading: false,
    error: null,
  });

  const translate = useCallback(async (text: string, context?: string) => {
    const { settings } = useSettingsStore.getState();
    const targetLang = settings.translationTargetLang || 'zh';

    setState({ translation: null, isLoading: true, error: null });

    try {
      const cached = await getCachedTranslation(text, targetLang);
      if (cached) {
        setState({ translation: cached, isLoading: false, error: null });
        return cached;
      }

      const result = await translateText(text, targetLang, context);
      await cacheTranslation(text, targetLang, result);
      setState({ translation: result, isLoading: false, error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation failed';
      setState({ translation: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    setState({ translation: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    translate,
    clear,
  };
}
