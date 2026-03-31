import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/stores/content-store', () => ({
  useContentStore: () => ({ addContent: vi.fn() }),
}));

vi.mock('@/lib/i18n/use-i18n', () => ({
  useI18n: () => ({
    messages: {
      pdfImport: {
        errorNoFile: 'Please select a PDF file',
        errorFileSize: 'File size must be under 10MB',
        dropzone: 'Drop a PDF file here, or click to browse',
        maxSize: 'Maximum file size: 10MB',
        extracting: 'Extracting...',
        extract: 'Extract Text',
        parseFailed: 'Failed to parse PDF',
        networkError: 'Network error. Please try again.',
        pages: 'pages',
        words: 'words',
        by: 'by',
        preview: 'Preview',
        showLess: 'Show less',
        showMore: 'Show more',
        labelTitle: 'Title',
        placeholderTitle: 'Enter a title...',
        difficulty: 'Difficulty',
        difficultyBeginner: 'Beginner',
        difficultyIntermediate: 'Intermediate',
        difficultyAdvanced: 'Advanced',
        tags: 'Tags (comma separated)',
        tagsPlaceholder: 'e.g. textbook, chapter-1',
        importing: 'Importing...',
        importAsArticle: 'Import as Article',
      },
    },
  }),
}));

import { PdfImport } from './pdf-import';

describe('PdfImport', () => {
  it('contains localized fallback strings in rendered markup', () => {
    const markup = renderToStaticMarkup(<PdfImport />);

    expect(markup).toContain('Drop a PDF file here, or click to browse');
    expect(markup).toContain('Maximum file size: 10MB');
  });
});
