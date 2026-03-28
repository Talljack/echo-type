import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TranslationContent } from './translation-content';

describe('TranslationContent', () => {
  it('renders the translated meaning before pronunciation for word cards', () => {
    const markup = renderToStaticMarkup(<TranslationContent type="word" itemTranslation="垃圾" pronunciation="træʃ" />);

    expect(markup.indexOf('垃圾')).toBeGreaterThan(-1);
    expect(markup.indexOf('træʃ')).toBeGreaterThan(-1);
    expect(markup.indexOf('垃圾')).toBeLessThan(markup.indexOf('træʃ'));
  });
});
