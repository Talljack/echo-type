import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

describe('MediaImport', () => {
  it('renders a degraded-success warning banner when extraction degrades to AI transcription', () => {
    const markup = renderToStaticMarkup(<MediaImport />);

    expect(markup).toContain('Imported via AI transcription because captions were unavailable.');
  });

  it('renders a partial-success warning banner when only part of the transcript is recovered', () => {
    const markup = renderToStaticMarkup(<MediaImport />);

    expect(markup).toContain('Partial transcript recovered. Review and edit before saving.');
  });
});
