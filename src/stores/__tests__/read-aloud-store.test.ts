import { beforeEach, describe, expect, it } from 'vitest';
import { useReadAloudStore } from '@/stores/read-aloud-store';

const SAMPLE_TEXT = 'Hello world. This is a test. Final sentence here.';

describe('read-aloud-store', () => {
  beforeEach(() => {
    useReadAloudStore.getState().deactivate();
  });

  describe('initial state', () => {
    it('starts inactive with empty data', () => {
      const state = useReadAloudStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.text).toBe('');
      expect(state.words).toEqual([]);
      expect(state.sentences).toEqual([]);
      expect(state.currentWordIndex).toBe(-1);
      expect(state.currentSentenceIndex).toBe(-1);
    });
  });

  describe('activate', () => {
    it('activates with parsed words and sentences', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      const state = useReadAloudStore.getState();

      expect(state.isActive).toBe(true);
      expect(state.isPlaying).toBe(false);
      expect(state.text).toBe(SAMPLE_TEXT);
      expect(state.words).toEqual(['Hello', 'world.', 'This', 'is', 'a', 'test.', 'Final', 'sentence', 'here.']);
      expect(state.sentences.length).toBe(3);
      expect(state.currentWordIndex).toBe(-1);
      expect(state.currentSentenceIndex).toBe(-1);
    });

    it('builds correct sentence ranges', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      const { sentences } = useReadAloudStore.getState();

      expect(sentences[0]).toEqual({ startWordIndex: 0, endWordIndex: 1, text: 'Hello world.' });
      expect(sentences[1]).toEqual({ startWordIndex: 2, endWordIndex: 5, text: 'This is a test.' });
      expect(sentences[2]).toEqual({ startWordIndex: 6, endWordIndex: 8, text: 'Final sentence here.' });
    });

    it('handles single sentence text', () => {
      useReadAloudStore.getState().activate('Just one sentence.');
      const { sentences, words } = useReadAloudStore.getState();

      expect(words).toEqual(['Just', 'one', 'sentence.']);
      expect(sentences.length).toBe(1);
      expect(sentences[0]).toEqual({ startWordIndex: 0, endWordIndex: 2, text: 'Just one sentence.' });
    });

    it('handles empty text', () => {
      useReadAloudStore.getState().activate('');
      const { words, sentences } = useReadAloudStore.getState();

      expect(words).toEqual([]);
      expect(sentences).toEqual([]);
    });
  });

  describe('deactivate', () => {
    it('resets all state', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setPlaying(true);
      useReadAloudStore.getState().setCurrentWordIndex(3);

      useReadAloudStore.getState().deactivate();
      const state = useReadAloudStore.getState();

      expect(state.isActive).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.text).toBe('');
      expect(state.words).toEqual([]);
      expect(state.sentences).toEqual([]);
      expect(state.currentWordIndex).toBe(-1);
      expect(state.currentSentenceIndex).toBe(-1);
    });
  });

  describe('setPlaying', () => {
    it('sets playing state', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);

      useReadAloudStore.getState().setPlaying(true);
      expect(useReadAloudStore.getState().isPlaying).toBe(true);

      useReadAloudStore.getState().setPlaying(false);
      expect(useReadAloudStore.getState().isPlaying).toBe(false);
    });
  });

  describe('setCurrentWordIndex', () => {
    it('updates word index and auto-detects sentence', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);

      useReadAloudStore.getState().setCurrentWordIndex(0);
      expect(useReadAloudStore.getState().currentWordIndex).toBe(0);
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(0);

      useReadAloudStore.getState().setCurrentWordIndex(3);
      expect(useReadAloudStore.getState().currentWordIndex).toBe(3);
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(1);

      useReadAloudStore.getState().setCurrentWordIndex(7);
      expect(useReadAloudStore.getState().currentWordIndex).toBe(7);
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(2);
    });

    it('sets sentence to -1 for out-of-range word index', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(100);
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(-1);
    });
  });

  describe('jumpToWord', () => {
    it('jumps to word and updates sentence index', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);

      useReadAloudStore.getState().jumpToWord(6);
      expect(useReadAloudStore.getState().currentWordIndex).toBe(6);
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(2);
    });
  });

  describe('nextSentence', () => {
    it('advances to next sentence', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(0);

      useReadAloudStore.getState().nextSentence();
      const state = useReadAloudStore.getState();
      expect(state.currentSentenceIndex).toBe(1);
      expect(state.currentWordIndex).toBe(2);
    });

    it('clamps to last sentence', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(7);

      useReadAloudStore.getState().nextSentence();
      const state = useReadAloudStore.getState();
      expect(state.currentSentenceIndex).toBe(2);
      expect(state.currentWordIndex).toBe(6);
    });

    it('does nothing on empty sentences', () => {
      useReadAloudStore.getState().activate('');
      useReadAloudStore.getState().nextSentence();
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(-1);
    });
  });

  describe('prevSentence', () => {
    it('goes back to start of current sentence if mid-sentence', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(4);

      useReadAloudStore.getState().prevSentence();
      const state = useReadAloudStore.getState();
      expect(state.currentSentenceIndex).toBe(1);
      expect(state.currentWordIndex).toBe(2);
    });

    it('goes to previous sentence if at start of current', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(2);

      useReadAloudStore.getState().prevSentence();
      const state = useReadAloudStore.getState();
      expect(state.currentSentenceIndex).toBe(0);
      expect(state.currentWordIndex).toBe(0);
    });

    it('clamps to first sentence', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setCurrentWordIndex(0);

      useReadAloudStore.getState().prevSentence();
      const state = useReadAloudStore.getState();
      expect(state.currentSentenceIndex).toBe(0);
      expect(state.currentWordIndex).toBe(0);
    });

    it('does nothing on empty sentences', () => {
      useReadAloudStore.getState().activate('');
      useReadAloudStore.getState().prevSentence();
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(-1);
    });

    it('does nothing when sentence index is negative', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().prevSentence();
      expect(useReadAloudStore.getState().currentSentenceIndex).toBe(-1);
    });
  });

  describe('resetProgress', () => {
    it('resets word/sentence indices and stops playing', () => {
      useReadAloudStore.getState().activate(SAMPLE_TEXT);
      useReadAloudStore.getState().setPlaying(true);
      useReadAloudStore.getState().setCurrentWordIndex(5);

      useReadAloudStore.getState().resetProgress();
      const state = useReadAloudStore.getState();
      expect(state.currentWordIndex).toBe(-1);
      expect(state.currentSentenceIndex).toBe(-1);
      expect(state.isPlaying).toBe(false);
      expect(state.isActive).toBe(true);
      expect(state.words.length).toBeGreaterThan(0);
    });
  });

  describe('abbreviation handling via splitSentences', () => {
    it('handles abbreviations correctly in sentence splitting', () => {
      useReadAloudStore.getState().activate('Dr. Smith is here. Mr. Jones arrived.');
      const { sentences } = useReadAloudStore.getState();
      expect(sentences.length).toBe(2);
      expect(sentences[0].text).toBe('Dr. Smith is here.');
      expect(sentences[1].text).toBe('Mr. Jones arrived.');
    });
  });
});
