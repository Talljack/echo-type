export type ContentBlockKind = 'title' | 'label' | 'paragraph' | 'quote';

export interface ContentBlock {
  id: string;
  text: string;
  kind: ContentBlockKind;
  words: string[];
  wordCount: number;
  wordStart: number;
  wordEnd: number;
}

function classifyContentBlock(text: string): ContentBlockKind {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const endsLikeSentence = /[.!?]$/.test(normalized);

  if (/^[—-]\s+/.test(normalized) || /^["“]/.test(normalized)) {
    return 'quote';
  }

  if (words.length <= 3 && normalized.length <= 36 && !endsLikeSentence) {
    return 'label';
  }

  if (words.length <= 10 && normalized.length <= 90 && !endsLikeSentence) {
    return 'title';
  }

  return 'paragraph';
}

function normalizeBlock(block: string): string {
  return block
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function splitContentBlocks(text: string): ContentBlock[] {
  let wordStart = 0;

  return text
    .split(/\n{2,}/)
    .map(normalizeBlock)
    .filter(Boolean)
    .map((blockText, index) => {
      const words = blockText.split(/\s+/).filter(Boolean);
      const block: ContentBlock = {
        id: `content-block-${index}`,
        text: blockText,
        kind: classifyContentBlock(blockText),
        words,
        wordCount: words.length,
        wordStart,
        wordEnd: words.length > 0 ? wordStart + words.length - 1 : wordStart - 1,
      };
      wordStart += words.length;
      return block;
    });
}
