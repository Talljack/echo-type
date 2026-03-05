export interface TypingState {
  mode: 'idle' | 'typing' | 'paused' | 'finished';
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  charStates: ('pending' | 'correct' | 'wrong')[];
  inputBuffer: string;
  errorCount: number;
  correctCount: number;
  totalKeystrokes: number;
  startTime: number | null;
  elapsedMs: number;
  wpm: number;
  accuracy: number;
  isShaking: boolean;
  completedWords: number;
  errorWords: string[];
  pauseStartTime: number | null;
  pausedDuration: number;
  showTranslation: boolean;
}

export type TypingAction =
  | { type: 'KEY_PRESS'; key: string }
  | { type: 'TICK_TIMER' }
  | { type: 'RESET_WORD' }
  | { type: 'WORD_COMPLETE' }
  | { type: 'SESSION_FINISH' }
  | { type: 'INIT'; text: string }
  | { type: 'RESET' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TOGGLE_TRANSLATION' };

function getInitialState(): TypingState {
  return {
    mode: 'idle',
    words: [],
    currentWordIndex: 0,
    currentCharIndex: 0,
    charStates: [],
    inputBuffer: '',
    errorCount: 0,
    correctCount: 0,
    totalKeystrokes: 0,
    startTime: null,
    elapsedMs: 0,
    wpm: 0,
    accuracy: 100,
    isShaking: false,
    completedWords: 0,
    errorWords: [],
    pauseStartTime: null,
    pausedDuration: 0,
    showTranslation: false,
  };
}

function buildCharStates(words: string[]): ('pending' | 'correct' | 'wrong')[] {
  const fullText = words.join(' ');
  return fullText.split('').map(() => 'pending');
}

function getGlobalCharIndex(words: string[], wordIndex: number, charIndex: number): number {
  let idx = 0;
  for (let w = 0; w < wordIndex; w++) {
    idx += words[w].length + 1; // +1 for space
  }
  return idx + charIndex;
}

function computeStats(state: {
  startTime: number | null;
  pausedDuration: number;
  completedWords: number;
  correctCount: number;
  totalKeystrokes: number;
}): { elapsedMs: number; wpm: number; accuracy: number } {
  const elapsed = state.startTime ? Date.now() - state.startTime - state.pausedDuration : 0;
  const seconds = elapsed / 1000;
  const wpm = seconds > 0 ? Math.round((state.completedWords / seconds) * 60) : 0;
  const accuracy = state.totalKeystrokes > 0 ? Math.round((state.correctCount / state.totalKeystrokes) * 100) : 100;
  return { elapsedMs: elapsed, wpm, accuracy };
}

export function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case 'INIT': {
      const words = action.text.split(/\s+/).filter(Boolean);
      return {
        ...getInitialState(),
        words,
        charStates: buildCharStates(words),
      };
    }

    case 'KEY_PRESS': {
      if (state.mode === 'finished') return state;

      const newState = { ...state };
      if (newState.mode === 'idle') {
        newState.mode = 'typing';
        newState.startTime = Date.now();
      }

      newState.totalKeystrokes++;
      const currentWord = state.words[state.currentWordIndex];
      if (!currentWord) return state;

      const expectedChar = currentWord[state.currentCharIndex];

      if (action.key === ' ' && state.currentCharIndex === currentWord.length) {
        // Space after completing a word — advance to next word
        const globalIdx = getGlobalCharIndex(state.words, state.currentWordIndex, currentWord.length);
        const newCharStates = [...state.charStates];
        if (globalIdx < newCharStates.length) {
          newCharStates[globalIdx] = 'correct';
        }

        const nextWordIndex = state.currentWordIndex + 1;
        if (nextWordIndex >= state.words.length) {
          const finalState = {
            ...newState,
            charStates: newCharStates,
            completedWords: newState.completedWords + 1,
            correctCount: newState.correctCount + 1,
            currentWordIndex: nextWordIndex,
            currentCharIndex: 0,
            inputBuffer: '',
          };
          const stats = computeStats(finalState);
          return {
            ...finalState,
            ...stats,
            mode: 'finished' as const,
          };
        }

        return {
          ...newState,
          charStates: newCharStates,
          currentWordIndex: nextWordIndex,
          currentCharIndex: 0,
          inputBuffer: '',
          completedWords: newState.completedWords + 1,
          correctCount: newState.correctCount + 1,
        };
      }

      if (action.key === expectedChar) {
        // Correct character
        const globalIdx = getGlobalCharIndex(state.words, state.currentWordIndex, state.currentCharIndex);
        const newCharStates = [...state.charStates];
        newCharStates[globalIdx] = 'correct';

        const nextCharIndex = state.currentCharIndex + 1;
        const isLastCharOfWord = nextCharIndex === currentWord.length;
        const isLastWord = state.currentWordIndex === state.words.length - 1;

        // Auto-finish when last char of last word is typed
        if (isLastCharOfWord && isLastWord) {
          const finalState = {
            ...newState,
            charStates: newCharStates,
            currentCharIndex: nextCharIndex,
            inputBuffer: state.inputBuffer + action.key,
            correctCount: newState.correctCount + 1,
            completedWords: newState.completedWords + 1,
          };
          const stats = computeStats(finalState);
          return {
            ...finalState,
            ...stats,
            mode: 'finished' as const,
          };
        }

        return {
          ...newState,
          charStates: newCharStates,
          currentCharIndex: nextCharIndex,
          inputBuffer: state.inputBuffer + action.key,
          correctCount: newState.correctCount + 1,
        };
      } else {
        // Wrong character — mark wrong and trigger shake
        const globalIdx = getGlobalCharIndex(state.words, state.currentWordIndex, state.currentCharIndex);
        const newCharStates = [...state.charStates];
        newCharStates[globalIdx] = 'wrong';

        const errorWords = state.errorWords.includes(currentWord)
          ? state.errorWords
          : [...state.errorWords, currentWord];

        return {
          ...newState,
          charStates: newCharStates,
          errorCount: state.errorCount + 1,
          isShaking: true,
          errorWords,
        };
      }
    }

    case 'RESET_WORD': {
      // Reset current word after error shake
      const currentWord = state.words[state.currentWordIndex];
      const newCharStates = [...state.charStates];

      // Reset all chars of current word to pending
      for (let i = 0; i < currentWord.length; i++) {
        const globalIdx = getGlobalCharIndex(state.words, state.currentWordIndex, i);
        newCharStates[globalIdx] = 'pending';
      }

      return {
        ...state,
        charStates: newCharStates,
        currentCharIndex: 0,
        inputBuffer: '',
        isShaking: false,
      };
    }

    case 'TICK_TIMER': {
      if (state.mode !== 'typing' || !state.startTime) return state;
      const stats = computeStats(state);
      return { ...state, ...stats };
    }

    case 'SESSION_FINISH': {
      return { ...state, mode: 'finished' };
    }

    case 'RESET': {
      if (state.words.length === 0) return getInitialState();
      return {
        ...getInitialState(),
        words: state.words,
        charStates: buildCharStates(state.words),
      };
    }

    case 'PAUSE': {
      if (state.mode !== 'typing') return state;
      return { ...state, mode: 'paused', pauseStartTime: Date.now() };
    }

    case 'RESUME': {
      if (state.mode !== 'paused' || !state.pauseStartTime) return state;
      return {
        ...state,
        mode: 'typing',
        pausedDuration: state.pausedDuration + (Date.now() - state.pauseStartTime),
        pauseStartTime: null,
      };
    }

    case 'TOGGLE_TRANSLATION': {
      return { ...state, showTranslation: !state.showTranslation };
    }

    default:
      return state;
  }
}

export { getInitialState };
