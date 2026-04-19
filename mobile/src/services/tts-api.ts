import { WordTimestamp } from '@/lib/word-alignment';

export interface EdgeTTSResponse {
  audio: string; // base64 encoded audio
  contentType: string;
  words: Array<{
    word: string;
    offset: number; // HNS (100-nanosecond units)
    duration: number; // HNS
  }>;
}

export interface TTSOptions {
  text: string;
  voice: string;
  speed?: number;
}

/**
 * Call the web API to synthesize speech with Edge TTS
 * Returns audio data and word-level timestamps
 */
export async function synthesizeEdgeTTS(options: TTSOptions): Promise<EdgeTTSResponse> {
  const { text, voice, speed = 1.0 } = options;

  // TODO: Replace with actual API URL (use environment variable)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const response = await fetch(`${apiUrl}/api/tts/edge/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, speed }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'TTS synthesis failed');
  }

  return response.json();
}

/**
 * Convert Edge TTS word boundaries (HNS units) to seconds
 */
export function convertEdgeWordsToTimestamps(
  edgeWords: EdgeTTSResponse['words'],
): Array<{ word: string; start: number; end: number }> {
  const HNS_TO_SECONDS = 1e-7;

  return edgeWords.map((w) => ({
    word: w.word,
    start: w.offset * HNS_TO_SECONDS,
    end: (w.offset + w.duration) * HNS_TO_SECONDS,
  }));
}

export interface EdgeVoice {
  id: string;
  name: string;
  shortName: string;
  locale: string;
  gender: string;
  personalities?: string[];
}

/**
 * Get list of available Edge TTS voices
 */
export async function getEdgeTTSVoices(): Promise<EdgeVoice[]> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const response = await fetch(`${apiUrl}/api/tts/edge/voices`);

  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }

  const data = (await response.json()) as { voices?: EdgeVoice[] };
  return data.voices || [];
}
