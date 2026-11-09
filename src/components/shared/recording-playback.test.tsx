import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecordingPlayback } from './recording-playback';

vi.mock('@/stores/language-store', () => ({
  useLanguageStore: (selector: (state: { interfaceLanguage: string }) => boolean) =>
    selector({ interfaceLanguage: 'en' }),
}));

describe('RecordingPlayback controls', () => {
  it('provides an accessible recording-specific play button and disables seek until duration is known', () => {
    const markup = renderToStaticMarkup(
      <RecordingPlayback blob={new Blob(['recording'])} label="My reading attempt" />,
    );
    expect(markup).toContain('<fieldset');
    expect(markup).toContain('aria-label="My reading attempt"');
    expect(markup).toContain('aria-label="Play recording"');
    expect(markup).toContain('aria-label="Recording position"');
    expect(markup).toMatch(/type="range"[^>]*disabled=""/);
    expect(markup).not.toContain('<audio');
  });
});
