import { useCallback, useEffect, useRef, useState } from 'react';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { splitSentences } from '@/lib/sentence-split';
import { useProviderStore } from '@/stores/provider-store';

export interface SentenceTranslation {
  original: string;
  translation: string;
}

export interface TranslationOptions {
  visible: boolean;
  shouldPrefetch?: boolean;
}

type TranslationResponse = {
  translation?: string;
  translations?: string[];
};

function normalizeOptions(options: boolean | TranslationOptions) {
  if (typeof options === 'boolean') {
    return { visible: options, shouldPrefetch: false };
  }

  return { visible: options.visible, shouldPrefetch: options.shouldPrefetch ?? false };
}

export function useTranslation(text: string, targetLang: string, options: boolean | TranslationOptions = true) {
  const { visible, shouldPrefetch } = normalizeOptions(options);
  const [translation, setTranslation] = useState<string | null>(null);
  const [sentenceTranslations, setSentenceTranslations] = useState<SentenceTranslation[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, SentenceTranslation[]>>(new Map());
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const activeHeaderKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
  const providerConfigs = useProviderStore((s) => s.providers);
  const isReady = Boolean(sentenceTranslations?.length || translation);

  const fetchTranslation = useCallback(async () => {
    if (!text || !targetLang) return;
    if (!visible && !shouldPrefetch) return;

    const cacheKey = `${text}::${targetLang}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSentenceTranslations(cached);
      setTranslation(cached.map((s) => s.translation).join(' '));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeApiKey && activeHeaderKey) headers[activeHeaderKey] = activeApiKey;

      const sentences = splitSentences(text);
      const endpoint = shouldPrefetch ? '/api/translate/free' : '/api/translate';
      const payload: Record<string, unknown> = shouldPrefetch
        ? { sentences, targetLang }
        : {
            sentences,
            targetLang,
            provider: activeProviderId,
            providerConfigs,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as TranslationResponse;
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Translation failed');
        return;
      }

      const translations = Array.isArray(data.translations) ? data.translations : undefined;

      if (translations) {
        const result: SentenceTranslation[] = sentences.map((s, i) => ({
          original: s,
          translation: translations[i] || '',
        }));
        cacheRef.current.set(cacheKey, result);
        setSentenceTranslations(result);
        setTranslation(result.map((s) => s.translation).join(' '));
      } else if (data.translation) {
        // Fallback: single string translation
        const result: SentenceTranslation[] = [{ original: text, translation: data.translation }];
        cacheRef.current.set(cacheKey, result);
        setSentenceTranslations(result);
        setTranslation(data.translation);
      }
    } catch (err) {
      console.error('Translation fetch error:', err);
      setError('Network error, please try again');
    } finally {
      setIsLoading(false);
    }
  }, [visible, shouldPrefetch, text, targetLang, activeProviderId, activeApiKey, activeHeaderKey, providerConfigs]);

  useEffect(() => {
    if (!shouldPrefetch || !text || !targetLang) return;
    void fetchTranslation();
  }, [shouldPrefetch, text, targetLang, fetchTranslation]);

  return { translation, sentenceTranslations, isLoading, error, isReady, fetchTranslation, retry: fetchTranslation };
}
