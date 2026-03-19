export interface KokoroVoice {
  id: string;
  name: string;
  language: string;
  langCode: string;
  gender: 'male' | 'female';
}

export interface KokoroSpeechInput {
  serverUrl: string;
  apiKey?: string;
  text: string;
  voice: string;
  speed?: number;
}

export const KOKORO_LANGUAGES: Record<string, string> = {
  a: 'American English',
  b: 'British English',
  j: 'Japanese',
  z: 'Chinese',
  e: 'Spanish',
  f: 'French',
  h: 'Hindi',
  i: 'Italian',
  p: 'Portuguese',
};

export const KOKORO_LANGUAGE_CODES: Record<string, string> = {
  a: 'en-US',
  b: 'en-GB',
  j: 'ja-JP',
  z: 'zh-CN',
  e: 'es-ES',
  f: 'fr-FR',
  h: 'hi-IN',
  i: 'it-IT',
  p: 'pt-BR',
};

export const DEFAULT_KOKORO_SERVER_URL =
  process.env.NEXT_PUBLIC_KOKORO_SERVER_URL?.trim() || 'http://54.166.253.41:8880';

export function parseKokoroVoiceId(id: string): { language: string; langCode: string; gender: 'male' | 'female' } {
  const langPrefix = id.charAt(0);
  const genderChar = id.charAt(1);
  return {
    language: KOKORO_LANGUAGES[langPrefix] ?? 'Unknown',
    langCode: KOKORO_LANGUAGE_CODES[langPrefix] ?? 'und',
    gender: genderChar === 'f' ? 'female' : 'male',
  };
}
