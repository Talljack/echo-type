import { useState, useEffect, useRef, useCallback } from 'react';
import { useProviderStore } from '@/stores/provider-store';
import { PROVIDER_REGISTRY } from '@/lib/providers';

export function useTranslation(text: string, targetLang: string) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeConfig = useProviderStore((s) => s.getActiveConfig());

  const fetchTranslation = useCallback(async () => {
    if (!text || !targetLang) return;

    const cacheKey = `${text}::${targetLang}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setTranslation(cached);
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = activeConfig.auth.apiKey || activeConfig.auth.accessToken || '';
      const headerKey = PROVIDER_REGISTRY[activeProviderId].headerKey;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers[headerKey] = apiKey;

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, targetLang, provider: activeProviderId, modelId: activeConfig.selectedModelId }),
      });
      const data = await res.json();
      if (data.translation) {
        cacheRef.current.set(cacheKey, data.translation);
        setTranslation(data.translation);
      }
    } catch (err) {
      console.error('Translation fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [text, targetLang, activeProviderId, activeConfig]);

  useEffect(() => {
    fetchTranslation();
  }, [fetchTranslation]);

  return { translation, isLoading };
}
