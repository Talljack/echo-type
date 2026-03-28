import { useEffect, useRef, useState } from 'react';

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{ partOfSpeech?: string; definitions?: unknown[] }>;
}

interface CachedResult {
  translation: string;
  phonetic: string;
  pos: string;
}

export interface WordDictionaryResult {
  translation: string;
  phonetic: string;
  pos: string;
  isLoading: boolean;
}

function isSingleWord(text: string): boolean {
  return text.trim().split(/\s+/).length === 1;
}

function extractPhonetic(entry: DictionaryEntry): string {
  if (entry.phonetic) return entry.phonetic;
  const fallback = entry.phonetics?.find((p) => p.text && p.text.length > 0);
  return fallback?.text || '';
}

function extractPos(entry: DictionaryEntry): string {
  return entry.meanings?.[0]?.partOfSpeech || '';
}

async function fetchDictionary(word: string): Promise<{ phonetic: string; pos: string }> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return { phonetic: '', pos: '' };
    const data = (await res.json()) as DictionaryEntry[];
    if (!Array.isArray(data) || data.length === 0) return { phonetic: '', pos: '' };
    return { phonetic: extractPhonetic(data[0]), pos: extractPos(data[0]) };
  } catch {
    return { phonetic: '', pos: '' };
  }
}

async function fetchTranslation(text: string, targetLang: string): Promise<string> {
  try {
    const res = await fetch('/api/translate/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { translation?: string };
    return data.translation || '';
  } catch {
    return '';
  }
}

export function useWordDictionary(word: string, targetLang: string, enabled: boolean): WordDictionaryResult {
  const [result, setResult] = useState<CachedResult>({ translation: '', phonetic: '', pos: '' });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setResult({ translation: '', phonetic: '', pos: '' });
      return;
    }

    if (!word) return;

    const key = `${word}::${targetLang}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResult(cached);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    async function load() {
      let phonetic = '';
      let pos = '';
      let translation = '';

      if (isSingleWord(word)) {
        const [dictResult, transResult] = await Promise.all([
          fetchDictionary(word),
          fetchTranslation(word, targetLang),
        ]);
        phonetic = dictResult.phonetic;
        pos = dictResult.pos;
        translation = transResult;
      } else {
        translation = await fetchTranslation(word, targetLang);
      }

      if (cancelled) return;

      const entry = { translation, phonetic, pos };
      cacheRef.current.set(key, entry);
      setResult(entry);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, word, targetLang]);

  return { ...result, isLoading };
}
