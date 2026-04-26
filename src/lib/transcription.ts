import { type ProviderResolution, resolveProviderForCapability } from './provider-resolver';
import type { ProviderConfig, ProviderId } from './providers';

export const SUPPORTED_MIME_TYPES = new Set([
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

export const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.mp4', '.webm', '.avi']);
export const MAX_TRANSCRIPTION_FILE_SIZE = 25 * 1024 * 1024;
const RETRYABLE_TRANSCRIPTION_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export interface UpstreamTranscriptionPayload {
  text?: string;
  language?: string;
  error?: { message?: string };
  segments?: Array<{ start: number; end: number; text: string }>;
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export function validateTranscriptionFile(file: File) {
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

export function getTranscriptionEndpoint(providerId: ProviderId): string {
  if (providerId === 'groq') {
    return 'https://api.groq.com/openai/v1/audio/transcriptions';
  }

  return 'https://api.openai.com/v1/audio/transcriptions';
}

export function getTranscriptionModel(providerId: ProviderId): string {
  return providerId === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1';
}

export function shouldRetryTranscriptionStatus(status: number): boolean {
  return RETRYABLE_TRANSCRIPTION_STATUSES.has(status);
}

export function getTranscriptionRetryDelayMs(attempt: number): number {
  return 300 * (attempt + 1);
}

export function buildUpstreamTranscriptionFormData(
  file: File,
  providerId: ProviderId,
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

export async function parseUpstreamTranscriptionPayload(response: Response): Promise<UpstreamTranscriptionPayload> {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as UpstreamTranscriptionPayload;
  } catch {
    return {
      error: {
        message: raw.slice(0, 500),
      },
    };
  }
}

export function resolveTranscriptionProvider(
  requestedProviderId: ProviderId,
  providerConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>,
  headers: Headers,
) {
  return resolveProviderForCapability({
    capability: 'transcribe',
    requestedProviderId,
    availableProviderConfigs: providerConfigs,
    headers,
  });
}

export function resolveTranscriptionProviderChain(
  requestedProviderId: ProviderId,
  providerConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>,
  headers: Headers,
): ProviderResolution[] {
  const chain: ProviderResolution[] = [];

  for (const candidateProviderId of [requestedProviderId, 'groq', 'openai'] as const) {
    try {
      const resolution = resolveTranscriptionProvider(candidateProviderId, providerConfigs, headers);
      if (!chain.some((entry) => entry.providerId === resolution.providerId)) {
        chain.push(resolution);
      }
    } catch {
      // Ignore unavailable providers while building the optional fallback chain.
    }
  }

  if (chain.length > 0) {
    return chain;
  }

  return [resolveTranscriptionProvider(requestedProviderId, providerConfigs, headers)];
}
