import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import enMessages from '@/lib/i18n/messages/library/en.json';
import zhMessages from '@/lib/i18n/messages/library/zh.json';

import * as mediaImportModule from './media-import';

describe('MediaImport warning contract', () => {
  it('renders degraded and partial warnings from extraction metadata', () => {
    expect(Reflect.get(enMessages.mediaImport, 'degradedImportWarning')).toBeTypeOf('string');
    expect(Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning')).toBeTypeOf('string');
    expect(Reflect.get(zhMessages.mediaImport, 'degradedImportWarning')).toBeTypeOf('string');
    expect(Reflect.get(zhMessages.mediaImport, 'partialTranscriptWarning')).toBeTypeOf('string');

    const ExtractionWarnings = Reflect.get(mediaImportModule, 'ExtractionWarnings');
    expect(ExtractionWarnings).toBeTypeOf('function');

    const degradedMarkup = renderToStaticMarkup(
      ExtractionWarnings({
        extractionMeta: {
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: false,
          warnings: [Reflect.get(enMessages.mediaImport, 'degradedImportWarning')],
        },
        messages: enMessages.mediaImport,
      }),
    );

    const partialMarkup = renderToStaticMarkup(
      ExtractionWarnings({
        extractionMeta: {
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: true,
          warnings: [Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning')],
        },
        messages: enMessages.mediaImport,
      }),
    );

    expect(degradedMarkup).toContain(Reflect.get(enMessages.mediaImport, 'degradedImportWarning'));
    expect(partialMarkup).toContain(Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning'));
  });
});
