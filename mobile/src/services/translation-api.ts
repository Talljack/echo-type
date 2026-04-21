export interface TranslationResult {
  itemTranslation: string;
  sentenceTranslations?: SentenceTranslation[];
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
}

export interface TranslationAPIResponse {
  itemTranslation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  translation?: string;
  translations?: string[];
  error?: string;
}

export interface SentenceTranslation {
  original: string;
  translation: string;
}

export function normalizeTranslationResponse(
  data: TranslationAPIResponse,
  sourceSentences: string[],
): SentenceTranslation[] {
  if (Array.isArray(data.translations)) {
    return sourceSentences.map((original, index) => ({
      original,
      translation: data.translations?.[index] || '',
    }));
  }

  const fallbackTranslation = data.translation ?? data.itemTranslation;
  if (!fallbackTranslation) {
    throw new Error('Translation failed');
  }

  return [
    {
      original: sourceSentences.join(' ').trim(),
      translation: fallbackTranslation,
    },
  ];
}

/**
 * Call the web API to translate text
 */
export async function translateText(text: string, targetLang: string, context?: string): Promise<TranslationResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const sourceSentences = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const response = await fetch(`${apiUrl}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      sentences: sourceSentences.length > 0 ? sourceSentences : [text],
      targetLang,
      context,
      provider: 'groq', // Default to groq
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Translation failed');
  }

  const data: TranslationAPIResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  const normalized = normalizeTranslationResponse(data, sourceSentences.length > 0 ? sourceSentences : [text]);

  return {
    itemTranslation: normalized.map((entry) => entry.translation).join('\n'),
    sentenceTranslations: normalized,
    exampleSentence: data.exampleSentence,
    exampleTranslation: data.exampleTranslation,
    pronunciation: data.pronunciation,
  };
}

/**
 * Translation cache using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'translation_cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedTranslation {
  result: TranslationResult;
  timestamp: number;
}

function getCacheKey(text: string, targetLang: string): string {
  return `${CACHE_KEY_PREFIX}${targetLang}_${text.substring(0, 50)}`;
}

/**
 * Get cached translation if available and not expired
 */
export async function getCachedTranslation(text: string, targetLang: string): Promise<TranslationResult | null> {
  try {
    const cacheKey = getCacheKey(text, targetLang);
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const data: CachedTranslation = JSON.parse(cached);

    // Check if expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error('Failed to get cached translation:', error);
    return null;
  }
}

/**
 * Cache translation result
 */
export async function cacheTranslation(text: string, targetLang: string, result: TranslationResult): Promise<void> {
  try {
    const cacheKey = getCacheKey(text, targetLang);
    const data: CachedTranslation = {
      result,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache translation:', error);
  }
}

/**
 * Clear all translation cache
 */
export async function clearTranslationCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    // Remove keys one by one
    for (const key of cacheKeys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to clear translation cache:', error);
  }
}
