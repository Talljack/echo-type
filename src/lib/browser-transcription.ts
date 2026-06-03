import type { ProviderAuthState, ProviderConfig, ProviderId } from '@/lib/providers';

export const DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD = 4 * 1024 * 1024;
const MAX_TRANSCRIPTION_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
  'video/mp4',
  'video/webm',
  'video/x-msvideo',
]);
const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.mp4', '.webm', '.avi']);
const DIRECT_TRANSCRIPTION_PROVIDER_IDS = ['groq', 'openai'] as const;

interface BrowserTranscriptionRequest {
  file: File;
  language?: string | null;
  provider: ProviderId;
  providerConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
}

export interface BrowserTranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: Array<{ start: number; end: number; text: string }>;
  providerId: ProviderId;
  credentialSource: 'stored';
  fallbackApplied: boolean;
  fallbackReason?: string;
}

function getStoredCredential(auth?: ProviderAuthState): string {
  return auth?.apiKey || auth?.accessToken || '';
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function validateDirectTranscriptionFile(file: File) {
  const ext = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported format "${ext}". Supported: MP3, WAV, M4A, OGG, FLAC, MP4, WebM, AVI`,
    };
  }

  if (
    file.type &&
    !SUPPORTED_MIME_TYPES.has(file.type) &&
    !file.type.startsWith('audio/') &&
    !file.type.startsWith('video/')
  ) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}".`,
    };
  }

  if (file.size > MAX_TRANSCRIPTION_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum 25MB. Try trimming the audio first.',
    };
  }

  return { valid: true };
}

function getTranscriptionEndpoint(providerId: 'groq' | 'openai'): string {
  return providerId === 'groq'
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';
}

function getTranscriptionModel(providerId: 'groq' | 'openai'): string {
  return providerId === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1';
}

function buildUpstreamTranscriptionFormData(
  file: File,
  providerId: 'groq' | 'openai',
  language?: string | null,
): FormData {
  const upstreamForm = new FormData();
  upstreamForm.append('file', file);
  upstreamForm.append('model', getTranscriptionModel(providerId));
  upstreamForm.append('response_format', 'verbose_json');
  upstreamForm.append('timestamp_granularities[]', 'segment');
  if (language) upstreamForm.append('language', language);
  return upstreamForm;
}

async function parseUpstreamTranscriptionPayload(response: Response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as {
      text?: string;
      language?: string;
      error?: { message?: string };
      segments?: Array<{ start: number; end: number; text: string }>;
    };
  } catch {
    return {
      error: {
        message: raw.slice(0, 500),
      },
    };
  }
}

function getDirectProviderChain(requestedProviderId: ProviderId): Array<'groq' | 'openai'> {
  const chain: Array<'groq' | 'openai'> = [];
  for (const providerId of [requestedProviderId, ...DIRECT_TRANSCRIPTION_PROVIDER_IDS]) {
    if ((providerId === 'groq' || providerId === 'openai') && !chain.includes(providerId)) {
      chain.push(providerId);
    }
  }
  return chain;
}

function normalizeSegments(
  segments: Array<{ start: number; end: number; text: string }> | undefined,
): Array<{ start: number; end: number; text: string }> {
  return (
    segments?.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
    })) ?? []
  );
}

export function shouldUseDirectBrowserTranscription(file: File): boolean {
  return file.size > DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD;
}

export async function transcribeInBrowser({
  file,
  language,
  provider,
  providerConfigs,
}: BrowserTranscriptionRequest): Promise<BrowserTranscriptionResult> {
  const fileValidation = validateDirectTranscriptionFile(file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error);
  }

  const directCandidates = getDirectProviderChain(provider)
    .map((providerId) => ({
      providerId,
      apiKey: getStoredCredential(providerConfigs[providerId]?.auth),
    }))
    .filter((candidate) => candidate.apiKey);

  if (directCandidates.length === 0) {
    throw new Error('Large media uploads need a configured Groq or OpenAI API key for direct browser transcription.');
  }

  const errors: string[] = [];

  for (const { providerId, apiKey } of directCandidates) {
    const response = await fetch(getTranscriptionEndpoint(providerId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: buildUpstreamTranscriptionFormData(file, providerId, language),
    }).catch((error) => {
      throw new Error(error instanceof Error ? error.message : 'Direct transcription request failed.');
    });

    const payload = await parseUpstreamTranscriptionPayload(response);

    if (!response.ok) {
      errors.push(payload.error?.message || `${providerId} transcription failed.`);
      continue;
    }

    const segments = normalizeSegments(payload.segments);
    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return {
      text: payload.text || '',
      language: payload.language || 'en',
      duration,
      segments,
      providerId,
      credentialSource: 'stored',
      fallbackApplied: providerId !== provider,
      fallbackReason:
        providerId !== provider ? `${provider} is not configured; using configured provider ${providerId}` : undefined,
    };
  }

  throw new Error(errors[0] || 'Direct browser transcription failed.');
}
