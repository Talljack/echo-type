import { describe, expect, it } from 'vitest';
import { splitContentBlocks } from './content-format';

describe('splitContentBlocks', () => {
  it('preserves paragraph boundaries and word indices', () => {
    const blocks = splitContentBlocks(`March 19, 2026

Company

OpenAI to acquire Astral

Today we are announcing the acquisition.

What happens next depends on closing conditions.`);

    expect(blocks).toHaveLength(5);
    expect(blocks.map((block) => block.text)).toEqual([
      'March 19, 2026',
      'Company',
      'OpenAI to acquire Astral',
      'Today we are announcing the acquisition.',
      'What happens next depends on closing conditions.',
    ]);
    expect(blocks.map((block) => block.kind)).toEqual(['title', 'label', 'title', 'paragraph', 'paragraph']);
    expect(blocks.map((block) => [block.wordStart, block.wordEnd])).toEqual([
      [0, 2],
      [3, 3],
      [4, 7],
      [8, 13],
      [14, 20],
    ]);
  });

  it('keeps quote-like blocks separate', () => {
    const blocks = splitContentBlocks(`Main section

“Astral has always focused on building tools.”

— Charlie Marsh`);

    expect(blocks.map((block) => block.kind)).toEqual(['title', 'quote', 'quote']);
  });
});
