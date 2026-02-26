'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTTSStore } from '@/stores/tts-store';

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  label: string; // formatted display name
}

function formatVoiceName(voice: SpeechSynthesisVoice): string {
  const name = voice.name;
  const tag = voice.localService ? '' : ' ☁️';
  return `${name}${tag}`;
}

/** Estimate listening duration in seconds based on word count and speech rate */
export function estimateListenDuration(text: string, rate: number = 1): number {
  const words = text.trim().split(/\s+/).length;
  // Average English speech: ~150 words per minute at rate 1.0
  const wpm = 150 * rate;
  return Math.ceil((words / wpm) * 60);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function useTTS() {
  const { voiceURI, speed, pitch, volume } = useTTSStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewingURI, setPreviewingURI] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (async on some browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function loadVoices() {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) return;

      const englishVoices = allVoices
        .filter((v) => v.lang.startsWith('en'))
        .sort((a, b) => {
          // Prefer non-local (cloud/premium) voices first
          if (a.localService !== b.localService) return a.localService ? 1 : -1;
          return a.name.localeCompare(b.name);
        })
        .map((v) => ({
          voiceURI: v.voiceURI,
          name: v.name,
          lang: v.lang,
          localService: v.localService,
          label: formatVoiceName(v),
        }));

      setVoices(englishVoices);
      setIsReady(true);
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Hydrate store from localStorage on mount
  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  // Auto-select default voice (Eddy en-US) when no voice is saved
  useEffect(() => {
    if (!isReady || voices.length === 0) return;
    const stored = useTTSStore.getState().voiceURI;
    if (stored) return; // user already has a preference
    const eddy = voices.find(
      (v) => v.name.toLowerCase().includes('eddy') && v.lang === 'en-US'
    );
    if (eddy) {
      useTTSStore.getState().setVoiceURI(eddy.voiceURI);
    }
  }, [isReady, voices]);

  /** Find the SpeechSynthesisVoice object matching the stored voiceURI */
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!voiceURI) return null;
    const allVoices = window.speechSynthesis.getVoices();
    return allVoices.find((v) => v.voiceURI === voiceURI) || null;
  }, [voiceURI]);

  /** Create a configured utterance with current TTS settings */
  const createUtterance = useCallback(
    (text: string, overrides?: { rate?: number }): SpeechSynthesisUtterance => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = overrides?.rate ?? speed;
      u.pitch = pitch;
      u.volume = volume;
      u.lang = 'en-US';
      const voice = getVoice();
      if (voice) u.voice = voice;
      return u;
    },
    [speed, pitch, volume, getVoice]
  );

  /** Speak text with current settings, returns the utterance for event binding */
  const speak = useCallback(
    (text: string, overrides?: { rate?: number }): SpeechSynthesisUtterance => {
      window.speechSynthesis.cancel();
      const u = createUtterance(text, overrides);
      utteranceRef.current = u;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      u.onerror = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      window.speechSynthesis.speak(u);
      return u;
    },
    [createUtterance]
  );

  /** Stop any current speech */
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setPreviewingURI(null);
  }, []);

  /** Preview a voice by speaking a sample sentence */
  const preview = useCallback(
    (text: string = 'Hello, I am your English tutor. Let me help you practice.') => {
      speak(text);
    },
    [speak]
  );

  /** Preview any voice by URI without changing the selected voice */
  const previewVoice = useCallback(
    (uri: string, text: string = 'Hello, I am your English tutor. Let me help you practice.') => {
      window.speechSynthesis.cancel();
      const allVoices = window.speechSynthesis.getVoices();
      const voice = allVoices.find((v) => v.voiceURI === uri) || null;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = speed;
      u.pitch = pitch;
      u.volume = volume;
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      utteranceRef.current = u;
      setPreviewingURI(uri);
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      u.onerror = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      window.speechSynthesis.speak(u);
    },
    [speed, pitch, volume]
  );

  return {
    voices,
    isReady,
    isSpeaking,
    previewingURI,
    speak,
    stop,
    preview,
    previewVoice,
    createUtterance,
    getVoice,
    estimateListenDuration,
    formatDuration,
  };
}