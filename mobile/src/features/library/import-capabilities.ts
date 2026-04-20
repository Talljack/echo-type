export type ImportMethod = 'url' | 'youtube' | 'pdf' | 'text' | 'ai';

export interface ImportOption {
  method: ImportMethod;
  label: string;
  enabled: boolean;
  note?: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
  { method: 'text', label: 'Text', enabled: true },
  { method: 'url', label: 'URL', enabled: true },
  { method: 'youtube', label: 'YouTube', enabled: true },
  { method: 'pdf', label: 'PDF', enabled: true },
  { method: 'ai', label: 'AI', enabled: true },
];

export function getImportOptions(): ImportOption[] {
  return IMPORT_OPTIONS;
}

export function isImportMethodEnabled(method: ImportMethod): boolean {
  return IMPORT_OPTIONS.some((item) => item.method === method && item.enabled);
}
