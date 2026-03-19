import { useCallback, useRef, useState } from 'react';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { splitSentences } from '@/lib/sentence-split';
import { useProviderStore } from '@/stores/provider-store';

export interface SentenceTranslation {
  original: string;
  translation: string;
}

export function useTranslation(text: string, targetLang: string, enabled: boolean = true) {
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

  const fetchTranslation = useCallback(async () => {
    if (!enabled || !text || !targetLang) return;

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

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sentences,
          targetLang,
          provider: activeProviderId,
          providerConfigs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Translation failed');
        return;
      }
      if (data.translations && Array.isArray(data.translations)) {
        const result: SentenceTranslation[] = sentences.map((s, i) => ({
          original: s,
          translation: data.translations[i] || '',
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
  }, [enabled, text, targetLang, activeProviderId, activeApiKey, activeHeaderKey, providerConfigs]);

  return { translation, sentenceTranslations, isLoading, error, fetchTranslation, retry: fetchTranslation };
}
