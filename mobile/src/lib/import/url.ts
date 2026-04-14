// URL content import utilities
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

// Extract metadata and content from URL
export async function importFromUrl(url: string): Promise<ImportResult> {
  return {
    success: false,
    error: 'This import method is not available in the current mobile MVP.',
  };
}

// Simple language detection
function detectLanguage(text: string): string {
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
export async function importFromYouTube(url: string): Promise<ImportResult> {
  return {
    success: false,
    error: 'This import method is not available in the current mobile MVP.',
  };
}

// Import from text input
export function importFromText(
  title: string,
  text: string,
  language: string = 'en',
  tags: string[] = [],
): ImportResult {
  if (!title.trim() || !text.trim()) {
    return {
      success: false,
      error: 'Title and text are required',
    };
  }

  const content: Content = {
    id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title.trim(),
    text: text.trim(),
    source: 'text',
    language,
    difficulty: 'intermediate',
    tags: ['manual', ...tags],
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
