// URL content import utilities
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

// Extract metadata and content from URL
export async function importFromUrl(url: string): Promise<ImportResult> {
  try {
    // Validate URL
    const urlObj = new URL(url);

    // Fetch the page
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : urlObj.hostname;

    // Extract main content (simple heuristic)
    // Remove scripts, styles, and common non-content elements
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to first 5000 characters
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '...';
    }

    if (!text || text.length < 50) {
      return {
        success: false,
        error: 'Could not extract meaningful content from URL',
      };
    }

    // Detect language (simple heuristic)
    const language = detectLanguage(text);

    const content: Content = {
      id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      text,
      source: 'url',
      sourceUrl: url,
      language,
      difficulty: 'intermediate',
      tags: ['imported', 'web'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
  try {
    // Extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (!videoIdMatch) {
      return {
        success: false,
        error: 'Invalid YouTube URL',
      };
    }

    const videoId = videoIdMatch[1];

    // For now, create a placeholder content
    // In production, you would call YouTube API or backend service
    const content: Content = {
      id: `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `YouTube Video: ${videoId}`,
      text: 'YouTube content import requires backend API integration. This is a placeholder.',
      source: 'youtube',
      sourceUrl: url,
      language: 'en',
      difficulty: 'intermediate',
      tags: ['youtube', 'video'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      },
    };

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
