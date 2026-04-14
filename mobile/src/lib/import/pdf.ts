// PDF import utilities
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Import from PDF file
export async function importFromPDF(): Promise<ImportResult> {
  try {
    // Pick PDF file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'PDF selection cancelled',
      };
    }

    const file = result.assets[0];

    // Check file size (10MB limit)
    if (file.size && file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'PDF file is too large (max 10MB)',
      };
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: 'application/pdf',
      name: file.name,
    } as any);

    // Upload to API
    const response = await fetch(`${API_URL}/api/import/pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to import PDF',
      };
    }

    const data = await response.json();

    const content: Content = {
      id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.metadata?.title || file.name.replace('.pdf', ''),
      text: data.text,
      source: 'pdf',
      language: 'en',
      difficulty: 'intermediate',
      tags: ['pdf', 'imported'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        fileName: file.name,
        pageCount: data.pageCount,
        author: data.metadata?.author,
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
      error: error instanceof Error ? error.message : 'Failed to import PDF',
    };
  }
}
