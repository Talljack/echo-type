export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: number;
}

export interface Settings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  ttsProvider: string;
  ttsVoice: string;
  ttsSpeed: number;
  sttProvider: string;
  translationProvider: string;
  autoSync: boolean;
  notifications: boolean;
  onboardingCompleted: boolean;

  // Audio & feedback
  hapticsEnabled: boolean;

  // Reminders
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:mm 24h

  // AI Provider
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;

  // Translation
  translationTargetLang: string;
  showListenTranslation: boolean;
  showReadTranslation: boolean;
  showSpeakTranslation: boolean;
  showWriteTranslation: boolean;

  // Recommendations
  enableRecommendations: boolean;
  recommendationCount: number;
}
