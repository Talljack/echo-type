// PDF import utilities
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { Content } from '@/lib/storage';

interface ImportResult {
  success: boolean;
  content?: Content;
  error?: string;
}

// Import from PDF file
export async function importFromPDF(): Promise<ImportResult> {
  return {
    success: false,
    error: 'This import method is not available in the current mobile MVP.',
  };
}
