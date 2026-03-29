import enFishAudioMessages from '@/lib/i18n/messages/fish-audio/en.json';
import zhFishAudioMessages from '@/lib/i18n/messages/fish-audio/zh.json';
import type { InterfaceLanguage } from '@/stores/language-store';
import type { TTSSource } from '@/stores/tts-store';

export type FishAudioModelId = 's2-pro' | 's2' | 's1' | 's1-mini';

const FISH_AUDIO_MODEL_IDS: FishAudioModelId[] = ['s2-pro', 's2', 's1', 's1-mini'];

const FISH_AUDIO_MESSAGES = {
  en: enFishAudioMessages,
  zh: zhFishAudioMessages,
} as const satisfies Record<InterfaceLanguage, typeof enFishAudioMessages>;

export function getLocalizedFishAudioModels(language: InterfaceLanguage) {
  const messages = FISH_AUDIO_MESSAGES[language];
  return FISH_AUDIO_MODEL_IDS.map((id) => ({
    id,
    label: messages.models[id].label,
    description: messages.models[id].description,
  }));
}

export const FISH_AUDIO_MODELS = getLocalizedFishAudioModels('en');

export interface FishVoice {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  tags: string[];
  languages: string[];
  authorName: string;
  authorAvatar: string;
  sampleAudio: string;
  sampleText: string;
  likeCount: number;
  taskCount: number;
}

export interface FishSpeechInput {
  apiKey: string;
  text: string;
  voiceId: string;
  model: FishAudioModelId;
  speed?: number;
}

export interface ResolvedTTSSource {
  source: TTSSource;
  reason?: string;
}

export function resolveTTSSource({
  requestedSource,
  hasFishCredentials,
  hasFishVoice,
  hasKokoroServerUrl = false,
  hasKokoroVoice = false,
  requiresBoundaryEvents = false,
}: {
  requestedSource: TTSSource;
  hasFishCredentials: boolean;
  hasFishVoice: boolean;
  hasKokoroServerUrl?: boolean;
  hasKokoroVoice?: boolean;
  requiresBoundaryEvents?: boolean;
}): ResolvedTTSSource {
  if (requiresBoundaryEvents) {
    return {
      source: 'browser',
      reason:
        requestedSource === 'fish'
          ? 'Boundary-based highlighting still requires browser speech when Fish Audio is selected.'
          : requestedSource === 'kokoro'
            ? 'Boundary-based highlighting still requires browser speech when Kokoro is selected.'
            : undefined,
    };
  }

  if (requestedSource === 'fish') {
    if (!hasFishCredentials) {
      return {
        source: 'browser',
        reason: 'Fish Audio is selected but no API key is configured.',
      };
    }
    if (!hasFishVoice) {
      return {
        source: 'browser',
        reason: 'Fish Audio is selected but no cloud voice is chosen yet.',
      };
    }
  }

  if (requestedSource === 'kokoro') {
    if (!hasKokoroServerUrl) {
      return {
        source: 'browser',
        reason: 'Kokoro is selected but no server URL is configured.',
      };
    }
    if (!hasKokoroVoice) {
      return {
        source: 'browser',
        reason: 'Kokoro is selected but no voice is chosen yet.',
      };
    }
  }

  return { source: requestedSource };
}
