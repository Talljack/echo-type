import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./conversation-area.tsx', import.meta.url), 'utf8');

describe('ConversationArea', () => {
  it('follows new messages in its scroll viewport', () => {
    expect(source).toMatch(/querySelector<HTMLElement>\('\[data-slot="scroll-area-viewport"\]'\)/);
    expect(source).toMatch(/viewport\.scrollTop = viewport\.scrollHeight;[\s\S]*\}, \[messages\.length\]\);/);
  });
});
