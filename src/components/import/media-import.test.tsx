import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import enMessages from '@/lib/i18n/messages/library/en.json';
import zhMessages from '@/lib/i18n/messages/library/zh.json';

describe('MediaImport warning contract', () => {
  it('renders degraded and partial warnings from extraction metadata', async () => {
    const degradedMessage = Reflect.get(enMessages.mediaImport, 'degradedImportWarning');
    const partialMessage = Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning');
    const degradedMessageZh = Reflect.get(zhMessages.mediaImport, 'degradedImportWarning');
    const partialMessageZh = Reflect.get(zhMessages.mediaImport, 'partialTranscriptWarning');

    expect(degradedMessage).toBeTypeOf('string');
    expect(partialMessage).toBeTypeOf('string');
    expect(degradedMessageZh).toBeTypeOf('string');
    expect(partialMessageZh).toBeTypeOf('string');

    // @ts-expect-error future export contract
    const { ExtractionWarnings } = await import('./media-import');
    expect(ExtractionWarnings).toBeTypeOf('function');

    const degradedMarkup = renderToStaticMarkup(
      ExtractionWarnings({
        extractionMeta: {
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: true,
          warnings: [],
        },
        messages: enMessages.mediaImport,
      }),
    );

    expect(degradedMarkup).toContain(degradedMessage);
    expect(degradedMarkup).toContain(partialMessage);
  });
});
