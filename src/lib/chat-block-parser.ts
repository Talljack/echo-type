import { parseAIJson } from '@/lib/parse-ai-json';
import type { RichBlock } from '@/types/chat';

export type ParsedSegment = RichBlock | { type: 'text'; content: string };

const BLOCK_REGEX = /:::(audio|quiz|fill-blank|vocab|translation|reading|analytics|resource)\s*\n([\s\S]*?)\n:::/g;

/**
 * Parse AI markdown response into a sequence of rich blocks and plain text segments.
 * Blocks are delimited by :::type\n{json}\n::: patterns.
 * Malformed blocks fall back to plain text.
 */
export function parseBlocks(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  const matches = content.matchAll(BLOCK_REGEX);

  for (const match of matches) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    // Add any text before this block
    if (matchStart > lastIndex) {
      const text = content.slice(lastIndex, matchStart).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    const blockType = match[1] as RichBlock['type'];
    const blockBody = match[2].trim();

    // Try to parse the block body as JSON
    const parsed = parseAIJson<Record<string, unknown>>(blockBody);
    if (parsed.data) {
      const block = { type: blockType, ...parsed.data } as unknown as RichBlock;
      segments.push(block);
    } else {
      // Try raw JSON parse (block body might be pure JSON)
      try {
        const data = JSON.parse(blockBody);
        const block = { type: blockType, ...data } as unknown as RichBlock;
        segments.push(block);
      } catch {
        // Fallback: treat as plain text (forgiving parser)
        segments.push({ type: 'text', content: match[0] });
      }
    }

    lastIndex = matchEnd;
  }

  // Add any remaining text after last block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  // If no blocks found, return entire content as text
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: 'text', content: content.trim() });
  }

  return segments;
}
