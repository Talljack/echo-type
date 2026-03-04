import { describe, expect, it } from 'vitest';
import { inferImportedContentType } from './import-content';

describe('import content helpers', () => {
  it('classifies a single token as a word', () => {
    expect(inferImportedContentType('hello')).toBe('word');
  });

  it('classifies short text as a phrase', () => {
    expect(inferImportedContentType('Nice to meet you today')).toBe('phrase');
  });

  it('classifies medium text as a sentence', () => {
    expect(inferImportedContentType('This is a practical sentence used for local import verification in the app.')).toBe(
      'sentence',
    );
  });

  it('classifies longer text as an article', () => {
    expect(
      inferImportedContentType(
        'This is a longer passage intended to verify that pasted text with enough words is classified as an article rather than a sentence or phrase inside the document import flow.',
      ),
    ).toBe('article');
  });
});
