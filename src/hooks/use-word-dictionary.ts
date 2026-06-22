import { useEffect, useRef, useState } from 'react';
import { getIOSNativeQAMockTranslation, getIOSNativeQAMode } from '@/lib/ios-native-qa';

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
  example?: string;
}

interface CachedResult {
  translation: string;
  phonetic: string;
  pos: string;
  meanings: WordMeaning[];
  example: string;
}

export interface WordDictionaryResult {
  translation: string;
  phonetic: string;
  pos: string;
  meanings: WordMeaning[];
  example: string;
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
  definitions: Array<{ definition: string; example?: string }>;
}

function extractRawMeanings(entry: DictionaryEntry): RawMeaning[] {
  if (!entry.meanings) return [];
  return entry.meanings
    .filter((m) => m.partOfSpeech && m.definitions?.length)
    .map((m) => ({
      pos: m.partOfSpeech!,
      definitions: m.definitions!.slice(0, 2).map((d) => ({ definition: d.definition, example: d.example })),
    }));
}

interface DictionaryResult {
  phonetic: string;
  pos: string;
  rawMeanings: RawMeaning[];
}

interface RawWordBookEntry {
  word?: string;
  sentence?: string;
}

const SOURCE_POS_MAP: Record<string, string> = {
  n: 'noun',
  noun: 'noun',
  v: 'verb',
  verb: 'verb',
  adj: 'adjective',
  adjective: 'adjective',
  adv: 'adverb',
  adverb: 'adverb',
  prep: 'preposition',
  preposition: 'preposition',
  pron: 'pronoun',
  pronoun: 'pronoun',
  conj: 'conjunction',
  conjunction: 'conjunction',
  interj: 'interjection',
  interjection: 'interjection',
};

const EXAMPLE_FALLBACK_BOOK_IDS = [
  'junior-high',
  'senior-high',
  'gaokao2026',
  'cet4',
  'cet6',
  'essential4000',
  'graduate',
  'tem4',
  'ielts',
  'it-words',
] as const;

const localExampleCache = new Map<string, Promise<string>>();

function parseSourceDefinition(sourceDefinition: string | undefined, fallbackPos: string): WordMeaning | null {
  const trimmed = sourceDefinition?.trim();
  if (!trimmed || !/[\u4e00-\u9fff]/.test(trimmed)) return null;

  const normalized = trimmed.replace(/\s+/g, ' ');
  const match = normalized.match(/^([A-Za-z]+)\.\s*(.+)$/);
  const pos = match ? SOURCE_POS_MAP[match[1]!.toLowerCase()] || match[1]! : fallbackPos || 'noun';
  const definition = (match?.[2] || normalized).trim();
  if (!definition) return null;

  return { pos, definition };
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

function isUsefulEnglishExample(word: string, sentence: string): boolean {
  const normalized = sentence.trim();
  if (!normalized || /[\u4e00-\u9fff]/.test(normalized)) return false;
  if (!/[.!?]$/.test(normalized)) return false;
  if (normalized.split(/\s+/).length < 4) return false;
  return normalized.toLowerCase().includes(word.trim().toLowerCase());
}

async function fetchLocalExampleSentence(word: string): Promise<string> {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord || normalizedWord.includes(' ')) return '';

  const cached = localExampleCache.get(normalizedWord);
  if (cached) return cached;

  const promise = (async () => {
    for (const bookId of EXAMPLE_FALLBACK_BOOK_IDS) {
      try {
        const res = await fetch(`/wordbooks/${bookId}.json`);
        if (!res.ok) continue;
        const entries = (await res.json()) as RawWordBookEntry[];
        const match = entries.find(
          (entry) =>
            entry.word?.trim().toLowerCase() === normalizedWord &&
            entry.sentence &&
            isUsefulEnglishExample(normalizedWord, entry.sentence),
        );
        if (match?.sentence) return match.sentence.trim();
      } catch {
        // Try the next local book.
      }
    }
    return '';
  })();

  localExampleCache.set(normalizedWord, promise);
  return promise;
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

  const allDefs = rawMeanings.flatMap((m) => m.definitions.map((d) => d.definition));
  const translations = await fetchBatchTranslations(allDefs, targetLang);

  let idx = 0;
  return rawMeanings
    .map((m) => {
      const translatedDefs = m.definitions.map(() => translations[idx++] || '');
      const example = m.definitions.find((definition) => definition.example)?.example;
      return {
        pos: m.pos,
        definition: translatedDefs.filter(Boolean).join('；'),
        example,
      };
    })
    .filter((meaning) => meaning.definition.length > 0);
}

export function useWordDictionary(
  word: string,
  targetLang: string,
  enabled: boolean,
  sourceDefinition?: string,
): WordDictionaryResult {
  const [result, setResult] = useState<CachedResult>({
    translation: '',
    phonetic: '',
    pos: '',
    meanings: [],
    example: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setResult({ translation: '', phonetic: '', pos: '', meanings: [], example: '' });
      return;
    }

    if (!word) return;

    const key = `${word}::${targetLang}::${sourceDefinition?.trim() || ''}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResult(cached);
      return;
    }

    if (getIOSNativeQAMode()) {
      const mockEntry = {
        translation: getIOSNativeQAMockTranslation(word, targetLang),
        phonetic: word ? `/${word.toLowerCase()}/` : '',
        pos: isSingleWord(word) ? 'noun' : '',
        meanings: isSingleWord(word)
          ? [
              {
                pos: 'noun',
                definition: getIOSNativeQAMockTranslation(`${word} practice term`, targetLang),
              },
            ]
          : [],
        example: '',
      };
      cacheRef.current.set(key, mockEntry);
      setResult(mockEntry);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    async function load() {
      let phonetic = '';
      let pos = '';
      let translation = '';
      let meanings: WordMeaning[] = [];
      let example = '';

      if (isSingleWord(word)) {
        const [dictResult, transResult] = await Promise.all([
          fetchDictionary(word),
          fetchTranslation(word, targetLang),
        ]);
        phonetic = dictResult.phonetic;
        pos = dictResult.pos;
        translation = transResult;

        const sourceMeaning = parseSourceDefinition(sourceDefinition, dictResult.pos);
        if (sourceMeaning) {
          meanings = [sourceMeaning];
        } else if (dictResult.rawMeanings.length > 0) {
          meanings = await translateMeanings(dictResult.rawMeanings, targetLang);
          example = meanings.find((meaning) => meaning.example)?.example || '';
        }
        if (!example) {
          example = await fetchLocalExampleSentence(word);
        }
      } else {
        translation = await fetchTranslation(word, targetLang);
      }

      if (cancelled) return;

      const entry = { translation, phonetic, pos, meanings, example };
      cacheRef.current.set(key, entry);
      setResult(entry);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, word, targetLang, sourceDefinition]);

  return { ...result, isLoading };
}
