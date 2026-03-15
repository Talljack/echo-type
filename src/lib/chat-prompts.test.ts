import { describe, expect, it } from 'vitest';
import {
  translationPrompt,
  fillBlankPrompt,
  quizPrompt,
  dictationPrompt,
  readingPrompt,
  analyticsPrompt,
  getPromptForExercise,
} from '@/lib/chat-prompts';

describe('chat-prompts', () => {
  const sampleText = 'The quick brown fox jumps over the lazy dog.';

  // ── translationPrompt ─────────────────────────────────────────────────

  describe('translationPrompt', () => {
    it('includes block format instructions', () => {
      const prompt = translationPrompt(sampleText);
      expect(prompt).toContain(':::');
      expect(prompt).toContain('translation');
    });

    it('includes the provided text', () => {
      const prompt = translationPrompt(sampleText);
      expect(prompt).toContain(sampleText);
    });

    it('includes difficulty level', () => {
      const prompt = translationPrompt(sampleText, 'advanced');
      expect(prompt).toContain('advanced');
    });
  });

  // ── fillBlankPrompt ───────────────────────────────────────────────────

  describe('fillBlankPrompt', () => {
    it('mentions fill-blank block format', () => {
      const prompt = fillBlankPrompt(sampleText);
      expect(prompt).toContain(':::fill-blank');
    });

    it('includes the text', () => {
      const prompt = fillBlankPrompt(sampleText);
      expect(prompt).toContain(sampleText);
    });
  });

  // ── quizPrompt ────────────────────────────────────────────────────────

  describe('quizPrompt', () => {
    it('mentions quiz block format', () => {
      const prompt = quizPrompt(sampleText);
      expect(prompt).toContain(':::quiz');
    });
  });

  // ── dictationPrompt ───────────────────────────────────────────────────

  describe('dictationPrompt', () => {
    it('mentions audio block format', () => {
      const prompt = dictationPrompt(sampleText);
      expect(prompt).toContain(':::audio');
    });

    it('includes the text for playback', () => {
      const prompt = dictationPrompt(sampleText);
      expect(prompt).toContain(sampleText);
    });
  });

  // ── readingPrompt ─────────────────────────────────────────────────────

  describe('readingPrompt', () => {
    it('mentions reading block format', () => {
      const prompt = readingPrompt(sampleText);
      expect(prompt).toContain(':::reading');
    });

    it('includes optional title', () => {
      const prompt = readingPrompt(sampleText, 'My Article');
      expect(prompt).toContain('My Article');
    });
  });

  // ── analyticsPrompt ───────────────────────────────────────────────────

  describe('analyticsPrompt', () => {
    it('includes analytics block format', () => {
      const data = { totalSessions: 10, avgAccuracy: 85 };
      const prompt = analyticsPrompt(data);
      expect(prompt).toContain(':::analytics');
    });

    it('includes stringified analytics data', () => {
      const data = { totalSessions: 10, avgAccuracy: 85 };
      const prompt = analyticsPrompt(data);
      expect(prompt).toContain('"totalSessions": 10');
      expect(prompt).toContain('"avgAccuracy": 85');
    });
  });

  // ── getPromptForExercise ──────────────────────────────────────────────

  describe('getPromptForExercise', () => {
    it('routes translation type correctly', () => {
      const prompt = getPromptForExercise('translation', sampleText);
      expect(prompt).toContain(':::translation');
    });

    it('routes fill-blank type correctly', () => {
      const prompt = getPromptForExercise('fill-blank', sampleText);
      expect(prompt).toContain(':::fill-blank');
    });

    it('routes quiz type correctly', () => {
      const prompt = getPromptForExercise('quiz', sampleText);
      expect(prompt).toContain(':::quiz');
    });

    it('routes dictation type correctly', () => {
      const prompt = getPromptForExercise('dictation', sampleText);
      expect(prompt).toContain(':::audio');
    });
  });
});
