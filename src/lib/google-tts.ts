export interface GoogleTTSVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

export interface GoogleSpeechInput {
  apiKey: string;
  text: string;
  voiceName: string;
  languageCode?: string;
  speed?: number;
  pitch?: number;
}

const GOOGLE_TTS_BASE_URL = 'https://texttospeech.googleapis.com/v1';

export const FALLBACK_GOOGLE_TTS_VOICES: GoogleTTSVoice[] = [
  { name: 'en-US-Wavenet-F', languageCodes: ['en-US'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-US-Wavenet-D', languageCodes: ['en-US'], ssmlGender: 'MALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-US-Wavenet-C', languageCodes: ['en-US'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-US-Wavenet-J', languageCodes: ['en-US'], ssmlGender: 'MALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-GB-Wavenet-A', languageCodes: ['en-GB'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-GB-Wavenet-B', languageCodes: ['en-GB'], ssmlGender: 'MALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-AU-Wavenet-A', languageCodes: ['en-AU'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
  { name: 'en-AU-Wavenet-B', languageCodes: ['en-AU'], ssmlGender: 'MALE', naturalSampleRateHertz: 24_000 },
];

function googleUrl(path: string, apiKey: string): string {
  const url = new URL(`${GOOGLE_TTS_BASE_URL}${path}`);
  url.searchParams.set('key', apiKey);
  return url.toString();
}

function formatGoogleError(status: number, fallback: string, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) return `${fallback} (${status}): ${error.message}`;
  }
  return `${fallback} (${status}).`;
}

export async function listGoogleVoices(apiKey: string): Promise<GoogleTTSVoice[]> {
  const response = await fetch(googleUrl('/voices', apiKey));
  const body = (await response.json().catch(() => ({}))) as { voices?: GoogleTTSVoice[] };

  if (!response.ok) {
    throw new Error(formatGoogleError(response.status, 'Google Cloud TTS voices request failed', body));
  }

  const voices = (body.voices ?? [])
    .filter((voice) => voice.languageCodes.some((code) => code.toLowerCase().startsWith('en')))
    .sort((a, b) => {
      const rank = (name: string) => {
        if (name.includes('Wavenet')) return 0;
        if (name.includes('Neural2')) return 1;
        if (name.includes('Chirp')) return 2;
        if (name.includes('Standard')) return 3;
        return 4;
      };
      const aLang = a.languageCodes[0] ?? '';
      const bLang = b.languageCodes[0] ?? '';
      if (aLang !== bLang) return aLang.localeCompare(bLang);
      const rankDiff = rank(a.name) - rank(b.name);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });

  return voices.length > 0 ? voices : FALLBACK_GOOGLE_TTS_VOICES;
}

export async function synthesizeGoogleSpeech({
  apiKey,
  text,
  voiceName,
  languageCode = 'en-US',
  speed = 1,
  pitch = 1,
}: GoogleSpeechInput): Promise<{ audioBuffer: Buffer; contentType: string }> {
  const response = await fetch(googleUrl('/text:synthesize', apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.min(4, Math.max(0.25, speed)),
        pitch: Math.min(20, Math.max(-20, (pitch - 1) * 10)),
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as { audioContent?: string };

  if (!response.ok) {
    throw new Error(formatGoogleError(response.status, 'Google Cloud TTS synthesis failed', body));
  }

  if (!body.audioContent) {
    throw new Error('Google Cloud TTS synthesis returned no audio.');
  }

  return {
    audioBuffer: Buffer.from(body.audioContent, 'base64'),
    contentType: 'audio/mpeg',
  };
}
