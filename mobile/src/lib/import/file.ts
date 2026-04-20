// Document file import: plain text locally; PDF/DOCX/EPUB via extract-text API
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { detectLanguage } from '@/lib/import/url';
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const MAX_DOCUMENT_IMPORT_BYTES = 20 * 1024 * 1024;

/** MIME types for document picker (txt, md, pdf, docx, epub) */
export const DOCUMENT_IMPORT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/epub+zip',
] as const;

export type ImportDocumentMeta = {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  language: 'en' | 'zh' | 'ja' | 'ko' | 'auto';
};

function extensionLower(name: string): string {
  const m = name.match(/\.[^.]+$/);
  return m ? m[0].toLowerCase() : '';
}

const LOCAL_TEXT_EXTENSIONS = new Set(['.txt', '.md', '.text']);

const API_EXTENSIONS = new Set(['.pdf', '.docx', '.epub']);

function mimeForExtension(ext: string): string {
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.epub':
      return 'application/epub+zip';
    case '.md':
      return 'text/markdown';
    default:
      return 'text/plain';
  }
}

function resolveLanguage(text: string, language: ImportDocumentMeta['language']): string {
  if (language === 'auto') return detectLanguage(text);
  return language;
}

function mergeImportedTags(userTags: string[], hints: string[]): string[] {
  return [...new Set([...userTags, ...hints, 'imported'])];
}

/**
 * Pick a document file and import content.
 * .txt / .md / .text: read locally. .pdf / .docx / .epub: POST to /api/import/extract-text
 */
export async function pickAndImportDocumentFile(meta: ImportDocumentMeta): Promise<ImportResult> {
  try {
    const pick = await DocumentPicker.getDocumentAsync({
      type: [...DOCUMENT_IMPORT_MIME_TYPES],
      copyToCacheDirectory: true,
    });

    if (pick.canceled) {
      return { success: false, error: 'DOCUMENT_PICK_CANCELLED' };
    }

    const file = pick.assets[0];
    if (!file) {
      return { success: false, error: 'NO_FILE_SELECTED' };
    }

    if (file.size != null && file.size > MAX_DOCUMENT_IMPORT_BYTES) {
      return { success: false, error: 'FILE_TOO_LARGE' };
    }

    const ext = extensionLower(file.name);

    if (LOCAL_TEXT_EXTENSIONS.has(ext)) {
      const text = await readAsStringAsync(file.uri, { encoding: 'utf8' });
      if (!text.trim()) {
        return { success: false, error: 'EMPTY_FILE' };
      }

      const title = file.name.replace(/\.[^.]+$/, '') || 'Imported';
      const language = resolveLanguage(text, meta.language);
      const content: Content = {
        id: `textfile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        title,
        text: text.trim(),
        source: 'text',
        language,
        difficulty: meta.difficulty,
        tags: mergeImportedTags(meta.tags, [ext.slice(1) || 'text']),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          fileName: file.name,
          format: ext.slice(1) || 'txt',
          wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        },
      };
      return { success: true, content };
    }

    if (API_EXTENSIONS.has(ext)) {
      const formData = new FormData();
      const filePart = {
        uri: file.uri,
        type: file.mimeType || mimeForExtension(ext),
        name: file.name,
      };
      // biome-ignore lint/suspicious/noExplicitAny: React Native FormData file field
      formData.append('file', filePart as any);

      const response = await fetch(`${API_URL}/api/import/extract-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = 'EXTRACT_FAILED';
        try {
          const err = await response.json();
          message = typeof err.error === 'string' ? err.error : message;
        } catch {
          /* ignore */
        }
        return { success: false, error: message };
      }

      const data = (await response.json()) as {
        text: string;
        wordCount?: number;
        metadata?: {
          title?: string | null;
          author?: string | null;
          pageCount?: number | null;
          format?: string;
          sourceFilename?: string;
        };
      };

      const body = data.text?.trim() ?? '';
      if (!body) {
        return { success: false, error: 'EMPTY_FILE' };
      }

      const language = resolveLanguage(body, meta.language);
      const baseTitle = data.metadata?.title?.trim() || file.name.replace(/\.[^.]+$/, '') || 'Imported';

      const content: Content = {
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        title: baseTitle,
        text: body,
        source: 'file',
        language,
        difficulty: meta.difficulty,
        tags: mergeImportedTags(meta.tags, [ext.slice(1) || 'document']),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          fileName: file.name,
          format: data.metadata?.format ?? ext.slice(1),
          pageCount: data.metadata?.pageCount ?? undefined,
          author: data.metadata?.author ?? undefined,
          wordCount: data.wordCount ?? body.split(/\s+/).filter(Boolean).length,
        },
      };

      return { success: true, content };
    }

    return { success: false, error: 'UNSUPPORTED_FORMAT' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'IMPORT_FAILED',
    };
  }
}
