import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { ReadAloudContent } from './read-aloud-content';

const SAMPLE_TEXT = 'Hello world. This is a test.';

describe('ReadAloudContent', () => {
  afterEach(() => {
    useReadAloudStore.getState().deactivate();
  });

  it('renders selectable word spans with spaces preserved for sentence selection', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const markup = renderToStaticMarkup(<ReadAloudContent text={SAMPLE_TEXT} />);

    expect(markup).toContain('Hello');
    expect(markup).toContain('world.');
    expect(markup).toContain('This');
    expect(markup).toContain('is');
    expect(markup).toContain('a');
    expect(markup).toContain('test.');

    expect(markup).toContain('select-text');
    expect(markup.replace(/<[^>]+>/g, '')).toBe(SAMPLE_TEXT);
    expect(markup).not.toContain('<button');
  });

  it('renders with data-testid attribute', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const markup = renderToStaticMarkup(<ReadAloudContent text={SAMPLE_TEXT} />);
    expect(markup).toContain('data-testid="read-aloud-content"');
  });

  it('keeps every word clickable without using native buttons', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const markup = renderToStaticMarkup(<ReadAloudContent text={SAMPLE_TEXT} />);
    const wordCount = (markup.match(/data-read-aloud-word=/g) || []).length;
    expect(wordCount).toBe(6);
    expect(markup).toContain('role="button"');
  });

  it('renders sentence translations when showTranslation is true', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const translations = [
      { startWordIndex: 0, endWordIndex: 1, translation: '你好世界。' },
      { startWordIndex: 2, endWordIndex: 5, translation: '这是一个测试。' },
    ];

    const markup = renderToStaticMarkup(
      <ReadAloudContent text={SAMPLE_TEXT} showTranslation sentenceTranslations={translations} />,
    );

    expect(markup).toContain('你好世界。');
    expect(markup).toContain('这是一个测试。');
  });

  it('does not render translations when showTranslation is false', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const translations = [{ startWordIndex: 0, endWordIndex: 1, translation: '你好世界。' }];

    const markup = renderToStaticMarkup(
      <ReadAloudContent text={SAMPLE_TEXT} showTranslation={false} sentenceTranslations={translations} />,
    );

    expect(markup).not.toContain('你好世界。');
  });

  it('does not render translations when sentenceTranslations is null', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const markup = renderToStaticMarkup(
      <ReadAloudContent text={SAMPLE_TEXT} showTranslation sentenceTranslations={null} />,
    );

    expect(markup).not.toContain('text-indigo-400');
  });

  it('handles empty text gracefully', () => {
    useReadAloudStore.getState().activate('');
    const markup = renderToStaticMarkup(<ReadAloudContent text="" />);

    const wordCount = (markup.match(/data-read-aloud-word=/g) || []).length;
    expect(wordCount).toBe(0);
  });

  it('renders without crashing when store is not activated', () => {
    const markup = renderToStaticMarkup(<ReadAloudContent text={SAMPLE_TEXT} />);
    expect(markup).toContain('Hello');
    expect(markup).toContain('test.');
  });

  it('renders multiline text as multiple blocks', () => {
    const multiline = 'First paragraph here.\n\nSecond paragraph there.';
    useReadAloudStore.getState().activate(multiline);
    const markup = renderToStaticMarkup(<ReadAloudContent text={multiline} />);

    expect(markup).toContain('First');
    expect(markup).toContain('paragraph');
    expect(markup).toContain('Second');
  });

  it('applies cursor-pointer class to word spans', () => {
    useReadAloudStore.getState().activate(SAMPLE_TEXT);
    const markup = renderToStaticMarkup(<ReadAloudContent text={SAMPLE_TEXT} />);
    expect(markup).toContain('cursor-pointer');
  });
});
