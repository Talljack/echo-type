import type { TTSSource } from '@/stores/tts-store';

export type FishAudioModelId = 'speech-1.6' | 'speech-1.5' | 'agent-x0' | 's1' | 's1-mini';

export const FISH_AUDIO_MODELS: Array<{ id: FishAudioModelId; label: string; description: string }> = [
  { id: 'speech-1.6', label: 'Speech 1.6', description: 'Recommended quality for natural narration' },
  { id: 'speech-1.5', label: 'Speech 1.5', description: 'Stable fallback with broad compatibility' },
  { id: 'agent-x0', label: 'Agent X0', description: 'More expressive conversational delivery' },
  { id: 's1', label: 'S1', description: 'Legacy high-quality backend' },
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
