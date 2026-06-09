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
  hasGoogleCredentials = false,
  hasGoogleVoice = false,
  hasOpenAICredentials = false,
  hasOpenAIVoice = false,
  hasEdgeVoice = false,
  requiresBoundaryEvents = false,
  edgeTemporarilyUnavailable = false,
  edgeTemporarilyUnavailableReason,
}: {
  requestedSource: TTSSource;
  hasFishCredentials: boolean;
  hasFishVoice: boolean;
  hasGoogleCredentials?: boolean;
  hasGoogleVoice?: boolean;
  hasOpenAICredentials?: boolean;
  hasOpenAIVoice?: boolean;
  hasEdgeVoice?: boolean;
  requiresBoundaryEvents?: boolean;
  edgeTemporarilyUnavailable?: boolean;
  edgeTemporarilyUnavailableReason?: string;
}): ResolvedTTSSource {
  if (requiresBoundaryEvents) {
    const cloudSources: TTSSource[] = ['fish', 'google', 'openai', 'edge'];
    if (cloudSources.includes(requestedSource)) {
      const sourceLabel =
        requestedSource === 'fish'
          ? 'Fish Audio'
          : requestedSource === 'google'
            ? 'Google Cloud TTS'
            : requestedSource === 'openai'
              ? 'OpenAI TTS'
              : 'Edge TTS';
      return {
        source: 'browser',
        reason: `Boundary-based highlighting still requires browser speech when ${sourceLabel} is selected.`,
      };
    }
    return { source: 'browser' };
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

  if (requestedSource === 'google') {
    if (!hasGoogleCredentials) {
      return {
        source: 'browser',
        reason: 'Google Cloud TTS is selected but no API key is configured.',
      };
    }
    if (!hasGoogleVoice) {
      return {
        source: 'browser',
        reason: 'Google Cloud TTS is selected but no voice is chosen yet.',
      };
    }
  }

  if (requestedSource === 'openai') {
    if (!hasOpenAICredentials) {
      return {
        source: 'browser',
        reason: 'OpenAI TTS is selected but no API key is configured.',
      };
    }
    if (!hasOpenAIVoice) {
      return {
        source: 'browser',
        reason: 'OpenAI TTS is selected but no voice is chosen yet.',
      };
    }
  }

  if (requestedSource === 'edge') {
    if (edgeTemporarilyUnavailable) {
      return {
        source: 'browser',
        reason:
          edgeTemporarilyUnavailableReason ?? 'Edge TTS is temporarily unavailable. Using browser voice for stability.',
      };
    }
    if (!hasEdgeVoice) {
      return {
        source: 'browser',
        reason: 'Edge TTS is selected but no voice is chosen yet.',
      };
    }
  }

  return { source: requestedSource };
}
