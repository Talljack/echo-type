export interface OpenAITTSVoice {
  id: string;
  name: string;
  description: string;
  gender: 'neutral' | 'female' | 'male';
}

export interface OpenAISpeechInput {
  apiKey: string;
  baseUrl?: string;
  text: string;
  model?: string;
  voice?: string;
  speed?: number;
  instructions?: string;
}

export const OPENAI_TTS_MODELS = ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] as const;

export const OPENAI_TTS_VOICES: OpenAITTSVoice[] = [
  { id: 'marin', name: 'Marin', description: 'Best quality OpenAI voice', gender: 'neutral' },
  { id: 'cedar', name: 'Cedar', description: 'Best quality OpenAI voice', gender: 'neutral' },
  { id: 'coral', name: 'Coral', description: 'Bright and expressive', gender: 'female' },
  { id: 'nova', name: 'Nova', description: 'Clear and energetic', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', description: 'Warm and polished', gender: 'female' },
  { id: 'alloy', name: 'Alloy', description: 'Balanced and neutral', gender: 'neutral' },
  { id: 'ash', name: 'Ash', description: 'Calm and natural', gender: 'neutral' },
  { id: 'ballad', name: 'Ballad', description: 'Soft narration style', gender: 'neutral' },
  { id: 'echo', name: 'Echo', description: 'Crisp male voice', gender: 'male' },
  { id: 'fable', name: 'Fable', description: 'Narrative voice', gender: 'neutral' },
  { id: 'onyx', name: 'Onyx', description: 'Deep male voice', gender: 'male' },
  { id: 'sage', name: 'Sage', description: 'Steady and conversational', gender: 'neutral' },
  { id: 'verse', name: 'Verse', description: 'Expressive narration', gender: 'neutral' },
];

function normalizeBaseUrl(baseUrl = 'https://api.openai.com/v1'): string {
  return baseUrl.trim().replace(/\/+$/, '') || 'https://api.openai.com/v1';
}

function formatOpenAIError(status: number, fallback: string, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: string } | string }).error;
    if (typeof error === 'string') return `${fallback} (${status}): ${error}`;
    if (error?.message) return `${fallback} (${status}): ${error.message}`;
  }
  return `${fallback} (${status}).`;
}

export async function synthesizeOpenAISpeech({
  apiKey,
  baseUrl,
  text,
  model = 'gpt-4o-mini-tts',
  voice = 'marin',
  speed = 1,
  instructions,
}: OpenAISpeechInput): Promise<{ audioBuffer: Buffer; contentType: string }> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: 'mp3',
      speed: Math.min(4, Math.max(0.25, speed)),
      ...(instructions?.trim() && model.startsWith('gpt-4o') ? { instructions: instructions.trim() } : {}),
    }),
  });

  const contentType = response.headers.get('Content-Type') ?? 'audio/mpeg';

  if (!response.ok) {
    const body = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
    throw new Error(formatOpenAIError(response.status, 'OpenAI TTS synthesis failed', body));
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (audioBuffer.length === 0) {
    throw new Error('OpenAI TTS synthesis returned no audio.');
  }

  return {
    audioBuffer,
    contentType: contentType.includes('audio/') ? contentType : 'audio/mpeg',
  };
}
