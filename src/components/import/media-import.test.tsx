import { describe, expect, it } from 'vitest';
import enMessages from '@/lib/i18n/messages/library/en.json';
import zhMessages from '@/lib/i18n/messages/library/zh.json';
import * as mediaImportModule from './media-import';

describe('MediaImport warning contract', () => {
  it('exports a dedicated warning renderer for extraction metadata', () => {
    expect(Reflect.get(mediaImportModule, 'ExtractionWarnings')).toBeTypeOf('function');
  });

  it('adds localized warning strings to the library messages', () => {
    expect(Reflect.get(enMessages.mediaImport, 'degradedImportWarning')).toBeTypeOf('string');
    expect(Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning')).toBeTypeOf('string');
    expect(Reflect.get(zhMessages.mediaImport, 'degradedImportWarning')).toBeTypeOf('string');
    expect(Reflect.get(zhMessages.mediaImport, 'partialTranscriptWarning')).toBeTypeOf('string');
  });
});
