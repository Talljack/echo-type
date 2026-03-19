import type { KokoroSpeechInput, KokoroVoice } from '@/lib/kokoro-shared';
import { parseKokoroVoiceId } from '@/lib/kokoro-shared';

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export async function listKokoroVoices(serverUrl: string, apiKey?: string): Promise<KokoroVoice[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const url = `${serverUrl.replace(/\/+$/, '')}/v1/audio/voices`;
    const response = await fetch(url, {
      headers: buildHeaders(apiKey),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Kokoro voices request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { voices?: string[] };
    const voiceIds = data.voices ?? [];

    return voiceIds.map((id: string) => {
      const { language, langCode, gender } = parseKokoroVoiceId(id);
      const name = id
        .replace(/^[a-z]{2}_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { id, name, language, langCode, gender };
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function synthesizeKokoroSpeech(
  input: KokoroSpeechInput,
): Promise<{ audioBuffer: ArrayBuffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const url = `${input.serverUrl.replace(/\/+$/, '')}/v1/audio/speech`;
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(input.apiKey),
      body: JSON.stringify({
        model: 'kokoro',
        input: input.text,
        voice: input.voice,
        response_format: 'mp3',
        speed: input.speed ?? 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Kokoro speech synthesis failed (${response.status}): ${text}`);
    }

    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    const audioBuffer = await response.arrayBuffer();
    return { audioBuffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}
