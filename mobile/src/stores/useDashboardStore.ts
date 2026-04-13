import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DashboardStats {
  totalStudyTime: number; // minutes
  streak: number; // days
  wordsLearned: number;
  lessonsCompleted: number;
}

interface ActivityRecord {
  date: string; // YYYY-MM-DD
  count: number; // number of sessions
}

interface DashboardState {
  stats: DashboardStats;
  activities: ActivityRecord[];

  // Actions
  updateStats: (updates: Partial<DashboardStats>) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  addActivity: (date: string) => void;
  getActivityByDate: (date: string) => ActivityRecord | undefined;
  getRecentActivities: (days: number) => ActivityRecord[];
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      stats: {
        totalStudyTime: 0,
        streak: 0,
        wordsLearned: 0,
        lessonsCompleted: 0,
      },
      activities: [],

      updateStats: (updates) => {
        set((state) => ({
          stats: { ...state.stats, ...updates },
        }));
      },

      incrementStreak: () => {
        set((state) => ({
          stats: { ...state.stats, streak: state.stats.streak + 1 },
        }));
      },

      resetStreak: () => {
        set((state) => ({
          stats: { ...state.stats, streak: 0 },
        }));
      },

      addActivity: (date) => {
        set((state) => {
          const existing = state.activities.find((a) => a.date === date);
          if (existing) {
            return {
              activities: state.activities.map((a) => (a.date === date ? { ...a, count: a.count + 1 } : a)),
            };
          }
          return {
            activities: [...state.activities, { date, count: 1 }],
          };
        });
      },

      getActivityByDate: (date) => {
        return get().activities.find((a) => a.date === date);
      },

      getRecentActivities: (days) => {
        const today = new Date();
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);

        return get().activities.filter((a) => {
          const activityDate = new Date(a.date);
          return activityDate >= cutoff;
        });
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
