import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import enMessages from '@/lib/i18n/messages/library/en.json';

describe('MediaImport warning contract', () => {
  it('renders the degraded warning when extraction is degraded but not partial', async () => {
    const degradedMessage = Reflect.get(enMessages.mediaImport, 'degradedImportWarning');
    expect(degradedMessage).toBeTypeOf('string');

    // @ts-expect-error future export contract
    const { ExtractionWarnings } = await import('./media-import');
    expect(ExtractionWarnings).toBeTypeOf('function');

    const markup = renderToStaticMarkup(
      <ExtractionWarnings
        extractionMeta={{
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: false,
          warnings: [],
        }}
        messages={enMessages.mediaImport}
      />,
    );

    expect(markup).toContain(degradedMessage);
    expect(markup).not.toContain(Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning'));
  });

  it('renders both warnings when extraction is degraded and partial', async () => {
    const degradedMessage = Reflect.get(enMessages.mediaImport, 'degradedImportWarning');
    const partialMessage = Reflect.get(enMessages.mediaImport, 'partialTranscriptWarning');
    expect(degradedMessage).toBeTypeOf('string');
    expect(partialMessage).toBeTypeOf('string');

    // @ts-expect-error future export contract
    const { ExtractionWarnings } = await import('./media-import');
    expect(ExtractionWarnings).toBeTypeOf('function');

    const markup = renderToStaticMarkup(
      <ExtractionWarnings
        extractionMeta={{
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: true,
          warnings: [],
        }}
        messages={enMessages.mediaImport}
      />,
    );

    expect(markup).toContain(degradedMessage);
    expect(markup).toContain(partialMessage);
  });
});
