import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createNewCard, type FSRSCardData, gradeCard, type Rating, State } from '@/lib/fsrs';

interface FSRSCard {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  fsrsData: FSRSCardData;
}

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
        const now = new Date();
        const fsrsData = gradeCard(undefined, 3, now).cardData; // Initialize as new card

        const card: FSRSCard = {
          id,
          word,
          meaning,
          example,
          fsrsData,
        };

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
        const now = new Date();
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id !== id) return c;
            const { cardData } = gradeCard(c.fsrsData, rating, now);
            return { ...c, fsrsData: cardData };
          }),
        }));
        get().incrementReviewCount();
      },

      getDueCards: () => {
        const now = Date.now();
        return get().cards.filter((c) => c.fsrsData.due <= now);
      },

      getCardCount: () => {
        const cards = get().cards;
        const now = Date.now();
        const due = cards.filter((c) => c.fsrsData.due <= now);
        return {
          total: cards.length,
          due: due.length,
          new: cards.filter((c) => c.fsrsData.state === State.New).length,
          learning: cards.filter((c) => c.fsrsData.state === State.Learning || c.fsrsData.state === State.Relearning)
            .length,
          review: cards.filter((c) => c.fsrsData.state === State.Review).length,
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

        const now = new Date();
        const newCards: FSRSCard[] = samples.map((s) => {
          const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const fsrsData = gradeCard(undefined, 3, now).cardData;
          return {
            id,
            word: s.word,
            meaning: s.meaning,
            example: s.example,
            fsrsData,
          };
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
