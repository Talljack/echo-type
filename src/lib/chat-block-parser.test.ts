import { describe, expect, it } from 'vitest';
import { parseBlocks } from '@/lib/chat-block-parser';

describe('chat-block-parser', () => {
  // ── Plain text ──────────────────────────────────────────────────────────

  describe('plain text', () => {
    it('returns a single text segment for plain markdown', () => {
      const segments = parseBlocks('Hello, how are you?');
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('text');
      if (segments[0].type === 'text') {
        expect(segments[0].content).toBe('Hello, how are you?');
      }
    });

    it('handles empty content', () => {
      const segments = parseBlocks('');
      expect(segments).toHaveLength(0);
    });

    it('handles whitespace-only content', () => {
      const segments = parseBlocks('   \n  \n  ');
      expect(segments).toHaveLength(0);
    });
  });

  // ── Quiz block ──────────────────────────────────────────────────────────

  describe('quiz block', () => {
    it('parses a valid quiz block', () => {
      const input = `Here's a question:

:::quiz
{"question": "What is 1+1?", "options": ["1", "2", "3"], "correctIndex": 1, "explanation": "Basic math"}
:::

Good luck!`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(3);
      expect(segments[0].type).toBe('text');
      expect(segments[1].type).toBe('quiz');
      if (segments[1].type === 'quiz') {
        expect(segments[1].question).toBe('What is 1+1?');
        expect(segments[1].options).toEqual(['1', '2', '3']);
        expect(segments[1].correctIndex).toBe(1);
        expect(segments[1].explanation).toBe('Basic math');
      }
      expect(segments[2].type).toBe('text');
    });
  });

  // ── Audio block ─────────────────────────────────────────────────────────

  describe('audio block', () => {
    it('parses a valid audio block', () => {
      const input = `:::audio
{"text": "Listen carefully", "label": "Pronunciation"}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('audio');
      if (segments[0].type === 'audio') {
        expect(segments[0].text).toBe('Listen carefully');
        expect(segments[0].label).toBe('Pronunciation');
      }
    });
  });

  // ── Vocab block ─────────────────────────────────────────────────────────

  describe('vocab block', () => {
    it('parses a valid vocab block', () => {
      const input = `:::vocab
{"word": "elaborate", "phonetic": "/ɪˈlæb.ər.ət/", "partOfSpeech": "adj", "definition": "complex", "example": "An elaborate plan"}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('vocab');
      if (segments[0].type === 'vocab') {
        expect(segments[0].word).toBe('elaborate');
        expect(segments[0].definition).toBe('complex');
      }
    });
  });

  // ── Fill-blank block ────────────────────────────────────────────────────

  describe('fill-blank block', () => {
    it('parses a valid fill-blank block', () => {
      const input = `:::fill-blank
{"sentence": "She ___ to school.", "answers": ["goes"], "hints": ["present tense"]}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('fill-blank');
      if (segments[0].type === 'fill-blank') {
        expect(segments[0].sentence).toBe('She ___ to school.');
        expect(segments[0].answers).toEqual(['goes']);
      }
    });
  });

  // ── Translation block ──────────────────────────────────────────────────

  describe('translation block', () => {
    it('parses a valid translation block', () => {
      const input = `:::translation
{"source": "Hello", "sourceLang": "English", "target": "你好", "targetLang": "Chinese"}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('translation');
      if (segments[0].type === 'translation') {
        expect(segments[0].source).toBe('Hello');
        expect(segments[0].target).toBe('你好');
      }
    });
  });

  // ── Reading block ──────────────────────────────────────────────────────

  describe('reading block', () => {
    it('parses a valid reading block', () => {
      const input = `:::reading
{"title": "My Story", "segments": [{"id": "s1", "text": "Once upon a time.", "translation": "从前。"}]}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('reading');
      if (segments[0].type === 'reading') {
        expect(segments[0].title).toBe('My Story');
        expect(segments[0].segments).toHaveLength(1);
        expect(segments[0].segments[0].text).toBe('Once upon a time.');
      }
    });
  });

  // ── Analytics block ────────────────────────────────────────────────────

  describe('analytics block', () => {
    it('parses a valid analytics block', () => {
      const input = `:::analytics
{"stats": [{"label": "Sessions", "value": 42}, {"label": "Accuracy", "value": "85%"}]}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('analytics');
      if (segments[0].type === 'analytics') {
        expect(segments[0].stats).toHaveLength(2);
        expect(segments[0].stats[0].label).toBe('Sessions');
      }
    });
  });

  // ── Resource block ─────────────────────────────────────────────────────

  describe('resource block', () => {
    it('parses a valid resource block', () => {
      const input = `:::resource
{"title": "English Grammar Guide", "description": "A comprehensive guide", "difficulty": "intermediate", "resourceType": "article"}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('resource');
      if (segments[0].type === 'resource') {
        expect(segments[0].title).toBe('English Grammar Guide');
      }
    });
  });

  // ── Mixed content ─────────────────────────────────────────────────────

  describe('mixed content', () => {
    it('parses text interleaved with blocks', () => {
      const input = `Let me explain:

:::vocab
{"word": "run", "definition": "to move quickly"}
:::

Now try this:

:::quiz
{"question": "What does 'run' mean?", "options": ["walk", "move quickly", "sleep"], "correctIndex": 1}
:::

Great job!`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(5);
      expect(segments[0].type).toBe('text');
      expect(segments[1].type).toBe('vocab');
      expect(segments[2].type).toBe('text');
      expect(segments[3].type).toBe('quiz');
      expect(segments[4].type).toBe('text');
    });

    it('handles multiple consecutive blocks', () => {
      const input = `:::audio
{"text": "Hello", "label": "Greeting"}
:::
:::audio
{"text": "Goodbye", "label": "Farewell"}
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('audio');
      expect(segments[1].type).toBe('audio');
    });
  });

  // ── Malformed blocks ──────────────────────────────────────────────────

  describe('malformed blocks', () => {
    it('falls back to text for invalid JSON in block', () => {
      const input = `:::quiz
this is not json
:::`;

      const segments = parseBlocks(input);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('text');
    });

    it('handles unclosed blocks as plain text', () => {
      const input = `Some text :::quiz
{"question": "test"}
More text without closing`;

      // Unclosed block should not match the regex
      const segments = parseBlocks(input);
      expect(segments.length).toBeGreaterThanOrEqual(1);
      // Everything should be text since the block isn't closed
      expect(segments.every((s) => s.type === 'text')).toBe(true);
    });
  });
});
