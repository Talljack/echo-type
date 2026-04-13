import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const useStateMock = vi.hoisted(() => vi.fn());

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: useStateMock,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/import/local-media-upload', () => ({
  LocalMediaUpload: () => <div data-testid="local-media-upload" />,
}));

vi.mock('@/components/shared/tag-selector', () => ({
  TagSelector: () => <div data-testid="tag-selector" />,
}));

vi.mock('@/stores/content-store', () => ({
  useContentStore: () => ({ addContent: vi.fn() }),
}));

vi.mock('@/stores/provider-store', () => ({
  useProviderStore: (selector: (state: any) => any) =>
    selector({
      activeProviderId: 'openai',
      getActiveConfig: () => ({ auth: { apiKey: 'test-api-key', accessToken: '' } }),
      providers: [],
    }),
}));

vi.mock('@/lib/i18n/use-i18n', () => ({
  useI18n: () => ({
    messages: {
      youtubeImport: {
        placeholderUrl: 'Paste a YouTube, Bilibili, or other media URL...',
      },
      quickAdd: {
        difficultyBeginner: 'Beginner',
        difficultyIntermediate: 'Intermediate',
        difficultyAdvanced: 'Advanced',
      },
      mediaImport: {
        tabUrl: 'URL Import',
        tabLocal: 'Local Upload',
        urlDescription: 'Import audio content from video platforms like YouTube, Bilibili, and more.',
        localDescription: 'Upload and transcribe local audio or video files.',
        extractFailed: 'Extraction failed',
        networkError: 'Network error. Please try again.',
        downloadFailed: 'Download failed',
        downloadFailedRetry: 'Download failed. Please try again.',
        extracting: 'Extracting...',
        extract: 'Extract',
        audioPreview: 'Audio Preview',
        transcript: 'Transcript',
        pasteTranscriptFromYoutube: 'Paste transcript from YouTube',
        transcriptFallbackHelp:
          'Auto-extraction failed (YouTube bot protection). Open the video, click "Show transcript" below the description, copy the text, and paste it here.',
        transcriptPlaceholder: 'Paste the transcript text here...',
        labelTitle: 'Title',
        labelCategory: 'Category',
        placeholderCategory: 'e.g. Technology, Travel...',
        difficulty: 'Difficulty',
        tags: 'Tags',
        tagsPlaceholder: 'e.g. video, lecture',
        directDownload: 'Direct Download',
        downloading: 'Downloading...',
        downloadAudio: 'Audio (MP3)',
        downloadVideo: 'Video (MP4)',
        saving: 'Saving...',
        pasteTranscriptToImport: 'Paste transcript to import',
        importToLibrary: 'Import to Library',
        degradedImportWarning: 'Imported via AI transcription because captions were unavailable.',
        partialTranscriptWarning: 'Partial transcript recovered. Review and edit before saving.',
      },
    },
  }),
}));

import { MediaImport } from './media-import';

type ExtractionMeta = {
  mode: 'captions' | 'audio-transcription';
  transcriptSource: string;
  degraded: boolean;
  partial: boolean;
  warnings: string[];
};

function renderWithExtractionMeta(extractionMeta: ExtractionMeta) {
  useStateMock.mockReset();

  const states = [
    'url',
    'https://www.youtube.com/watch?v=contract-test',
    false,
    '',
    {
      title: 'Recovered Transcript',
      text: 'Recovered transcript text.',
      platform: 'youtube',
      sourceUrl: 'https://www.youtube.com/watch?v=contract-test',
      audioUrl: 'https://cdn.example.com/audio.m4a',
      videoDuration: 42,
      extractionMeta,
    },
    'Recovered Transcript',
    'beginner',
    'video, lecture',
    'Technology',
    false,
    false,
    null,
    '',
    'Recovered transcript text.',
  ] as const;

  let index = 0;
  useStateMock.mockImplementation((initialValue: unknown) => {
    const value = index < states.length ? states[index] : initialValue;
    index += 1;
    return [value, vi.fn()];
  });

  return renderToStaticMarkup(<MediaImport />);
}

describe('MediaImport', () => {
  it('renders a degraded-success warning banner from extraction metadata', () => {
    const markup = renderWithExtractionMeta({
      mode: 'audio-transcription',
      transcriptSource: 'stt-groq',
      degraded: true,
      partial: false,
      warnings: ['captions unavailable'],
    });

    expect(markup).toContain('Imported via AI transcription because captions were unavailable.');
  });

  it('renders a partial-success warning banner from extraction metadata', () => {
    const markup = renderWithExtractionMeta({
      mode: 'audio-transcription',
      transcriptSource: 'stt-groq',
      degraded: true,
      partial: true,
      warnings: ['partial transcript recovered'],
    });

    expect(markup).toContain('Partial transcript recovered. Review and edit before saving.');
  });
});
