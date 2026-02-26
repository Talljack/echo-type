import { useState, useEffect, useRef, useCallback } from 'react';

export function useTranslation(text: string, targetLang: string) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

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
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
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
  }, [text, targetLang]);

  useEffect(() => {
    fetchTranslation();
  }, [fetchTranslation]);

  return { translation, isLoading };
}
