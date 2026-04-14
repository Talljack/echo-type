// AI content generation utilities
import Constants from 'expo-constants';
import type { Content } from '@/lib/storage';

interface GenerateOptions {
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  length: 'short' | 'medium' | 'long';
  language: string;
}

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Generate content using AI
export async function generateWithAI(options: GenerateOptions): Promise<ImportResult> {
  try {
    const response = await fetch(`${API_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.topic,
        difficulty: options.difficulty,
        length: options.length,
        language: options.language,
        type: 'article',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to generate content with AI',
      };
    }

    const data = await response.json();

    const content: Content = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      text: data.text,
      source: 'ai',
      language: options.language,
      difficulty: options.difficulty,
      tags: ['ai-generated', options.difficulty],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        topic: options.topic,
        generatedBy: data.providerId || 'ai',
        wordCount: data.text.split(/\s+/).length,
      },
    };

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content with AI',
    };
  }
}
