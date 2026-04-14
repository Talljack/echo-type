// Local media upload and transcription

import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import type { Content } from '@/lib/storage';

interface TranscribeResult {
  success: boolean;
  content?: Content;
  error?: string;
  text?: string;
  duration?: number;
  language?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function pickAndTranscribeMedia(): Promise<TranscribeResult> {
  try {
    // Pick audio/video file
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'video/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'File selection cancelled',
      };
    }

    const file = result.assets[0];
    if (!file) {
      return {
        success: false,
        error: 'No file selected',
      };
    }

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || 'audio/mpeg',
      name: file.name,
    } as any);

    // Call transcription API
    const response = await fetch(`${API_URL}/api/import/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to transcribe media',
      };
    }

    const data = await response.json();

    const content: Content = {
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      text: data.text,
      source: 'local-media',
      language: data.language || 'en',
      difficulty: 'intermediate',
      tags: ['media', 'transcribed'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        sourceFilename: file.name,
        duration: data.duration,
        platform: 'local',
        audioUrl: file.uri,
      },
    };

    return {
      success: true,
      content,
      text: data.text,
      duration: data.duration,
      language: data.language,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process media file',
    };
  }
}
