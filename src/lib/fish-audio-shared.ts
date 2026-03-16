import type { TTSSource } from '@/stores/tts-store';

export type FishAudioModelId = 's2-pro' | 's2' | 's1' | 's1-mini';

export const FISH_AUDIO_MODELS: Array<{ id: FishAudioModelId; label: string; description: string }> = [
  { id: 's2-pro', label: 'S2 Pro', description: 'Latest model with emotion control and best quality' },
  { id: 's2', label: 'S2', description: 'Expressive generation with inline tag control' },
  { id: 's1', label: 'S1', description: 'High-quality and natural sounding' },
  { id: 's1-mini', label: 'S1 Mini', description: 'Lower-latency lightweight backend' },
];

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
  requiresBoundaryEvents = false,
}: {
  requestedSource: TTSSource;
  hasFishCredentials: boolean;
  hasFishVoice: boolean;
  requiresBoundaryEvents?: boolean;
}): ResolvedTTSSource {
  if (requiresBoundaryEvents) {
    return {
      source: 'browser',
      reason: requestedSource === 'fish' ? 'Boundary-based highlighting still requires browser speech.' : undefined,
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

  return { source: requestedSource };
}
