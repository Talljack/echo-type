// URL content import utilities
import Constants from 'expo-constants';
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export type ImportContentOverrides = {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  language?: 'en' | 'zh' | 'ja' | 'ko' | 'auto';
};

function mergeSourceTags(base: string[], extra: string[] | undefined): string[] {
  return [...new Set([...(extra ?? []), ...base])];
}

// Extract metadata and content from URL
export async function importFromUrl(url: string, overrides?: ImportContentOverrides): Promise<ImportResult> {
  try {
    const response = await fetch(`${API_URL}/api/import/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to import from URL',
      };
    }

    const data = await response.json();

    const lang = !overrides?.language || overrides.language === 'auto' ? detectLanguage(data.text) : overrides.language;

    const content: Content = {
      id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      text: data.text,
      source: 'url',
      language: lang,
      difficulty: overrides?.difficulty ?? 'intermediate',
      tags: mergeSourceTags(['url', 'imported'], overrides?.tags),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        sourceUrl: data.url,
        wordCount: data.wordCount,
      },
    };

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from URL',
    };
  }
}

/** Heuristic language tag for learner content (en/zh fallback). */
export function detectLanguage(text: string): string {
  // Check for common English words
  const englishWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an'];
  const chineseChars = /[\u4e00-\u9fa5]/;

  const hasEnglish = englishWords.some((word) => text.toLowerCase().includes(` ${word} `));
  const hasChinese = chineseChars.test(text);

  if (hasChinese) return 'zh';
  if (hasEnglish) return 'en';
  return 'en'; // default
}

// Import from YouTube URL
export async function importFromYouTube(url: string, overrides?: ImportContentOverrides): Promise<ImportResult> {
  try {
    const response = await fetch(`${API_URL}/api/import/youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to import from YouTube',
      };
    }

    const data = await response.json();

    const lang =
      !overrides?.language || overrides.language === 'auto' ? detectLanguage(data.fullText) : overrides.language;

    const content: Content = {
      id: `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `YouTube: ${data.videoId}`,
      text: data.fullText,
      source: 'youtube',
      language: lang,
      difficulty: overrides?.difficulty ?? 'intermediate',
      tags: mergeSourceTags(['youtube', 'video', 'imported'], overrides?.tags),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        videoId: data.videoId,
        sourceUrl: url,
        segmentCount: data.segmentCount,
        segments: data.segments,
        wordCount: data.fullText.split(/\s+/).length,
      },
    };

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from YouTube',
    };
  }
}

export type ImportFromTextOptions = {
  language?: 'en' | 'zh' | 'ja' | 'ko' | 'auto';
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
};

// Import from text input
export function importFromText(title: string, text: string, options?: ImportFromTextOptions): ImportResult {
  if (!title.trim() || !text.trim()) {
    return {
      success: false,
      error: 'Title and text are required',
    };
  }

  const trimmed = text.trim();
  const language = !options?.language || options.language === 'auto' ? detectLanguage(trimmed) : options.language;
  const difficulty = options?.difficulty ?? 'intermediate';
  const extraTags = options?.tags?.filter(Boolean) ?? [];

  const content: Content = {
    id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title.trim(),
    text: trimmed,
    source: 'text',
    language,
    difficulty,
    tags: ['manual', ...extraTags],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      wordCount: text.trim().split(/\s+/).length,
    },
  };

  return {
    success: true,
    content,
  };
}
