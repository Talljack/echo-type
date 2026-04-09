import { useEffect, useRef, useState } from 'react';

interface DictionaryDefinition {
  definition: string;
  example?: string;
}

interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: DictionaryMeaning[];
}

export interface WordMeaning {
  pos: string;
  definition: string;
}

interface CachedResult {
  translation: string;
  phonetic: string;
  pos: string;
  meanings: WordMeaning[];
}

export interface WordDictionaryResult {
  translation: string;
  phonetic: string;
  pos: string;
  meanings: WordMeaning[];
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

interface RawMeaning {
  pos: string;
  definitions: string[];
}

function extractRawMeanings(entry: DictionaryEntry): RawMeaning[] {
  if (!entry.meanings) return [];
  return entry.meanings
    .filter((m) => m.partOfSpeech && m.definitions?.length)
    .map((m) => ({
      pos: m.partOfSpeech!,
      definitions: m.definitions!.slice(0, 2).map((d) => d.definition),
    }));
}

interface DictionaryResult {
  phonetic: string;
  pos: string;
  rawMeanings: RawMeaning[];
}

async function fetchDictionary(word: string): Promise<DictionaryResult> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return { phonetic: '', pos: '', rawMeanings: [] };
    const data = (await res.json()) as DictionaryEntry[];
    if (!Array.isArray(data) || data.length === 0) return { phonetic: '', pos: '', rawMeanings: [] };
    return {
      phonetic: extractPhonetic(data[0]),
      pos: extractPos(data[0]),
      rawMeanings: extractRawMeanings(data[0]),
    };
  } catch {
    return { phonetic: '', pos: '', rawMeanings: [] };
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

async function fetchBatchTranslations(sentences: string[], targetLang: string): Promise<string[]> {
  try {
    const res = await fetch('/api/translate/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences, targetLang }),
    });
    if (!res.ok) return sentences.map(() => '');
    const data = (await res.json()) as { translations?: string[] };
    return data.translations || sentences.map(() => '');
  } catch {
    return sentences.map(() => '');
  }
}

async function translateMeanings(rawMeanings: RawMeaning[], targetLang: string): Promise<WordMeaning[]> {
  if (rawMeanings.length === 0) return [];

  const allDefs = rawMeanings.flatMap((m) => m.definitions);
  const translations = await fetchBatchTranslations(allDefs, targetLang);

  let idx = 0;
  return rawMeanings.map((m) => {
    const translatedDefs = m.definitions.map(() => translations[idx++] || '');
    return {
      pos: m.pos,
      definition: translatedDefs.filter(Boolean).join('；'),
    };
  });
}

export function useWordDictionary(word: string, targetLang: string, enabled: boolean): WordDictionaryResult {
  const [result, setResult] = useState<CachedResult>({
    translation: '',
    phonetic: '',
    pos: '',
    meanings: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setResult({ translation: '', phonetic: '', pos: '', meanings: [] });
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
      let meanings: WordMeaning[] = [];

      if (isSingleWord(word)) {
        const [dictResult, transResult] = await Promise.all([
          fetchDictionary(word),
          fetchTranslation(word, targetLang),
        ]);
        phonetic = dictResult.phonetic;
        pos = dictResult.pos;
        translation = transResult;

        if (dictResult.rawMeanings.length > 0) {
          meanings = await translateMeanings(dictResult.rawMeanings, targetLang);
        }
      } else {
        translation = await fetchTranslation(word, targetLang);
      }

      if (cancelled) return;

      const entry = { translation, phonetic, pos, meanings };
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
