import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SpeakState {
  currentContentId: string | null;
  isRecording: boolean;
  recordingDuration: number;
  lastRecordingUri: string | null;
  showTranscript: boolean;

  setCurrentContent: (contentId: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  setLastRecordingUri: (uri: string | null) => void;
  setShowTranscript: (show: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentContentId: null,
  isRecording: false,
  recordingDuration: 0,
  lastRecordingUri: null,
  showTranscript: true,
};

export const useSpeakStore = create<SpeakState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentContent: (contentId) => set({ currentContentId: contentId }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setRecordingDuration: (duration) => set({ recordingDuration: duration }),
      setLastRecordingUri: (uri) => set({ lastRecordingUri: uri }),
      setShowTranscript: (show) => set({ showTranscript: show }),
      reset: () => set(initialState),
    }),
    {
      name: 'speak-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
