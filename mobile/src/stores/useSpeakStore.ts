import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useDashboardStore } from './useDashboardStore';

export interface SpeakSessionRoute {
  type: 'content' | 'scenario' | 'free';
  contentId?: string;
  scenarioId?: string;
  topic?: string;
}

interface SpeakSession {
  id: string;
  contentId: string;
  score: number;
  duration: number; // seconds
  completedAt: number;
  title?: string;
  route?: SpeakSessionRoute;
}

interface CurrentSpeakSession {
  contentId: string;
  title?: string;
  route?: SpeakSessionRoute;
}

interface SpeakState {
  sessions: SpeakSession[];
  currentSession: CurrentSpeakSession | null;
  isRecording: boolean;
  recognizedText: string;

  // Actions
  startSession: (contentId: string, options?: { title?: string; route?: SpeakSessionRoute }) => void;
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
      currentSession: null,
      isRecording: false,
      recognizedText: '',

      startSession: (contentId, options) => {
        set({
          currentSession: {
            contentId,
            title: options?.title,
            route: options?.route,
          },
          recognizedText: '',
        });
      },

      endSession: (score, duration) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const session: SpeakSession = {
          id: `speak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: currentSession.contentId,
          score,
          duration,
          completedAt: Date.now(),
          title: currentSession.title,
          route: currentSession.route,
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSession: null,
          isRecording: false,
          recognizedText: '',
        }));

        useDashboardStore.getState().recordPracticeSession('speak', duration);
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
