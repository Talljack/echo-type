import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IOSReadAloudControls } from './ios-read-aloud-controls';

describe('IOSReadAloudControls', () => {
  it('offers the same discrete playback speeds as the web controls', () => {
    const markup = renderToStaticMarkup(
      <IOSReadAloudControls
        label="Listen controls"
        onPlay={() => {}}
        onPause={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );

    for (const speed of ['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x']) {
      expect(markup).toContain(`>${speed}</button>`);
    }
  });

  it('disables restart when the page has no restart handler, matching web controls', () => {
    const markup = renderToStaticMarkup(
      <IOSReadAloudControls
        label="Listen controls"
        onPlay={() => {}}
        onPause={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );

    expect(markup).toMatch(/disabled=""[^>]*aria-label="Restart"/);
  });
});
