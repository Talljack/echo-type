import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SpeakSession {
  id: string;
  contentId: string;
  score: number;
  duration: number; // seconds
  completedAt: number;
}

interface SpeakState {
  sessions: SpeakSession[];
  currentContentId: string | null;
  isRecording: boolean;
  recognizedText: string;

  // Actions
  startSession: (contentId: string) => void;
  endSession: (score: number, duration: number) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecognizedText: (text: string) => void;
  getSessionsByContent: (contentId: string) => SpeakSession[];
  getTotalSpeakTime: () => number;
  getAverageScore: () => number;
}

export const useSpeakStore = create<SpeakState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentContentId: null,
      isRecording: false,
      recognizedText: '',

      startSession: (contentId) => {
        set({
          currentContentId: contentId,
          recognizedText: '',
        });
      },

      endSession: (score, duration) => {
        const { currentContentId } = get();
        if (!currentContentId) return;

        const session: SpeakSession = {
          id: `speak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: currentContentId,
          score,
          duration,
          completedAt: Date.now(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentContentId: null,
          isRecording: false,
          recognizedText: '',
        }));
      },

      setIsRecording: (isRecording) => {
        set({ isRecording });
      },

      setRecognizedText: (text) => {
        set({ recognizedText: text });
      },

      getSessionsByContent: (contentId) => {
        return get().sessions.filter((s) => s.contentId === contentId);
      },

      getTotalSpeakTime: () => {
        return get().sessions.reduce((total, session) => total + session.duration, 0);
      },

      getAverageScore: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const totalScore = sessions.reduce((sum, session) => sum + session.score, 0);
        return Math.round(totalScore / sessions.length);
      },
    }),
    {
      name: 'speak-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
