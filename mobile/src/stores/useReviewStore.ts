import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createNewCard, type FSRSCard, getDueCards, type Rating, reviewCard } from '@/lib/fsrs';

interface ReviewState {
  cards: FSRSCard[];
  todayReviewCount: number;
  lastReviewDate: string | null;

  // Actions
  addCard: (word: string, meaning: string, example?: string) => void;
  removeCard: (id: string) => void;
  reviewCardById: (id: string, rating: Rating) => void;
  getDueCards: () => FSRSCard[];
  getCardCount: () => { total: number; due: number; new: number; learning: number; review: number };
  incrementReviewCount: () => void;
  addSampleCards: () => void;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      cards: [],
      todayReviewCount: 0,
      lastReviewDate: null,

      addCard: (word, meaning, example) => {
        const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const card = createNewCard(id, word, meaning, example);
        set((state) => ({
          cards: [...state.cards, card],
        }));
      },

      removeCard: (id) => {
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
        }));
      },

      reviewCardById: (id, rating) => {
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? reviewCard(c, rating) : c)),
        }));
        get().incrementReviewCount();
      },

      getDueCards: () => {
        return getDueCards(get().cards);
      },

      getCardCount: () => {
        const cards = get().cards;
        const now = Date.now();
        const due = cards.filter((c) => c.due <= now);
        return {
          total: cards.length,
          due: due.length,
          new: cards.filter((c) => c.state === 'new').length,
          learning: cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length,
          review: cards.filter((c) => c.state === 'review').length,
        };
      },

      incrementReviewCount: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastReviewDate, todayReviewCount } = get();

        if (lastReviewDate !== today) {
          set({ todayReviewCount: 1, lastReviewDate: today });
        } else {
          set({ todayReviewCount: todayReviewCount + 1 });
        }
      },

      addSampleCards: () => {
        const samples = [
          {
            word: 'Resilient',
            meaning: 'Able to recover quickly from difficulties',
            example: 'She is a resilient person who always bounces back.',
          },
          {
            word: 'Eloquent',
            meaning: 'Fluent or persuasive in speaking or writing',
            example: 'The speaker gave an eloquent speech about justice.',
          },
          {
            word: 'Ambiguous',
            meaning: 'Open to more than one interpretation',
            example: 'The instructions were ambiguous and confusing.',
          },
          {
            word: 'Diligent',
            meaning: "Having or showing care in one's work",
            example: 'She is a diligent student who always completes her homework.',
          },
          {
            word: 'Pragmatic',
            meaning: 'Dealing with things in a practical way',
            example: 'We need a pragmatic approach to solve this problem.',
          },
        ];

        const newCards = samples.map((s) => {
          const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          return createNewCard(id, s.word, s.meaning, s.example);
        });

        set((state) => ({
          cards: [...state.cards, ...newCards],
        }));
      },
    }),
    {
      name: 'review-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
