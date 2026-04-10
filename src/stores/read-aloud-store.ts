'use client';

import { create } from 'zustand';
import { splitSentences } from '@/lib/sentence-split';

interface SentenceRange {
  startWordIndex: number;
  endWordIndex: number;
  text: string;
}

interface ReadAloudState {
  isActive: boolean;
  isPlaying: boolean;
  text: string;
  words: string[];
  sentences: SentenceRange[];
  currentWordIndex: number;
  currentSentenceIndex: number;

  activate: (text: string) => void;
  deactivate: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentWordIndex: (index: number) => void;
  setCurrentSentenceIndex: (index: number) => void;
  jumpToWord: (index: number) => void;
  nextSentence: () => void;
  prevSentence: () => void;
  resetProgress: () => void;
}

function buildSentenceRanges(text: string): SentenceRange[] {
  const rawSentences = splitSentences(text);
  const ranges: SentenceRange[] = [];
  let wordStart = 0;

  for (const sentence of rawSentences) {
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    if (wordCount === 0) continue;
    ranges.push({
      startWordIndex: wordStart,
      endWordIndex: wordStart + wordCount - 1,
      text: sentence,
    });
    wordStart += wordCount;
  }

  return ranges;
}

export const useReadAloudStore = create<ReadAloudState>((set, get) => ({
  isActive: false,
  isPlaying: false,
  text: '',
  words: [],
  sentences: [],
  currentWordIndex: -1,
  currentSentenceIndex: -1,

  activate: (text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = buildSentenceRanges(text);
    set({
      isActive: true,
      isPlaying: false,
      text,
      words,
      sentences,
      currentWordIndex: -1,
      currentSentenceIndex: -1,
    });
  },

  deactivate: () => {
    set({
      isActive: false,
      isPlaying: false,
      text: '',
      words: [],
      sentences: [],
      currentWordIndex: -1,
      currentSentenceIndex: -1,
    });
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setCurrentWordIndex: (index: number) => {
    const { sentences } = get();
    const sentenceIdx = sentences.findIndex((s) => index >= s.startWordIndex && index <= s.endWordIndex);
    set({ currentWordIndex: index, currentSentenceIndex: sentenceIdx });
  },

  setCurrentSentenceIndex: (index: number) => set({ currentSentenceIndex: index }),

  jumpToWord: (index: number) => {
    const { sentences } = get();
    const sentenceIdx = sentences.findIndex((s) => index >= s.startWordIndex && index <= s.endWordIndex);
    set({ currentWordIndex: index, currentSentenceIndex: sentenceIdx });
  },

  nextSentence: () => {
    const { sentences, currentSentenceIndex } = get();
    if (sentences.length === 0) return;
    const next = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    set({ currentSentenceIndex: next, currentWordIndex: sentences[next].startWordIndex });
  },

  prevSentence: () => {
    const { sentences, currentSentenceIndex, currentWordIndex } = get();
    if (sentences.length === 0 || currentSentenceIndex < 0) return;

    const currentSentence = sentences[currentSentenceIndex];
    if (currentSentence && currentWordIndex > currentSentence.startWordIndex) {
      set({ currentWordIndex: currentSentence.startWordIndex });
      return;
    }

    const prev = Math.max(currentSentenceIndex - 1, 0);
    set({ currentSentenceIndex: prev, currentWordIndex: sentences[prev].startWordIndex });
  },

  resetProgress: () => {
    set({ currentWordIndex: -1, currentSentenceIndex: -1, isPlaying: false });
  },
}));
