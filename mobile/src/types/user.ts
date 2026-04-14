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
}
