import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type TranslationCacheEntry } from '@/lib/db';
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

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function makeCacheKey(text: string, targetLang: string): string {
  return `${text}::${targetLang}`;
}

const memCache = new Map<string, SentenceTranslation[]>();

async function getFromDb(key: string): Promise<SentenceTranslation[] | null> {
  try {
    const entry = await db.translationCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      db.translationCache.delete(key).catch(() => {});
      return null;
    }
    return entry.translations;
  } catch {
    return null;
  }
}

async function saveToDb(key: string, translations: SentenceTranslation[]): Promise<void> {
  try {
    const entry: TranslationCacheEntry = { key, translations, createdAt: Date.now() };
    await db.translationCache.put(entry);
  } catch {
    /* IndexedDB may be unavailable in some contexts */
  }
}

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
  const abortRef = useRef<AbortController | null>(null);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const activeHeaderKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
  const providerConfigs = useProviderStore((s) => s.providers);
  const isReady = Boolean(sentenceTranslations?.length || translation);

  const applyResult = useCallback((result: SentenceTranslation[]) => {
    setSentenceTranslations(result);
    setTranslation(result.map((s) => s.translation).join(' '));
  }, []);

  const fetchTranslation = useCallback(async () => {
    if (!text || !targetLang) return;
    if (!visible && !shouldPrefetch) return;

    const cacheKey = makeCacheKey(text, targetLang);

    // 1. Memory cache (instant)
    const memHit = memCache.get(cacheKey);
    if (memHit) {
      applyResult(memHit);
      return;
    }

    // 2. IndexedDB cache (async but local)
    const dbHit = await getFromDb(cacheKey);
    if (dbHit) {
      memCache.set(cacheKey, dbHit);
      applyResult(dbHit);
      return;
    }

    // 3. Network fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
      });

      const data = (await res.json()) as TranslationResponse;
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Translation failed');
        return;
      }

      const translations = Array.isArray(data.translations) ? data.translations : undefined;
      let result: SentenceTranslation[];

      if (translations) {
        result = sentences.map((s, i) => ({
          original: s,
          translation: translations[i] || '',
        }));
      } else if (data.translation) {
        result = [{ original: text, translation: data.translation }];
      } else {
        return;
      }

      memCache.set(cacheKey, result);
      void saveToDb(cacheKey, result);
      applyResult(result);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Translation fetch error:', err);
      setError('Network error, please try again');
    } finally {
      setIsLoading(false);
    }
  }, [
    visible,
    shouldPrefetch,
    text,
    targetLang,
    activeProviderId,
    activeApiKey,
    activeHeaderKey,
    providerConfigs,
    applyResult,
  ]);

  useEffect(() => {
    if (!shouldPrefetch || visible || !text || !targetLang) return;
    void fetchTranslation();
  }, [shouldPrefetch, visible, text, targetLang, fetchTranslation]);

  return { translation, sentenceTranslations, isLoading, error, isReady, fetchTranslation, retry: fetchTranslation };
}
