export type BrowserVoiceProvider = 'apple' | 'google' | 'microsoft' | 'browser-cloud' | 'other';
export type BrowserVoiceType = 'natural' | 'standard' | 'novelty';
export type BrowserVoiceAccent =
  | 'us'
  | 'uk'
  | 'au'
  | 'ca'
  | 'in'
  | 'ie'
  | 'za'
  | 'nz'
  | 'sg'
  | 'other-english'
  | 'non-english';

export interface BrowserVoiceMetadata {
  provider: BrowserVoiceProvider;
  voiceType: BrowserVoiceType;
  accent: BrowserVoiceAccent;
  isEnglish: boolean;
  isFeatured: boolean;
}

const NOVELTY_NAME_PATTERNS = [
  'grandma',
  'grandpa',
  'bad news',
  'good news',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'hysterical',
  'pipe organ',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
];

const APPLE_VOICE_NAMES = new Set([
  'alex',
  'daniel',
  'fred',
  'karen',
  'kathy',
  'moira',
  'rishi',
  'samantha',
  'tessa',
  'veena',
  'victoria',
  'allison',
  'ava',
  'serena',
]);

const GOOGLE_VOICE_NAMES = new Set([
  'eddy',
  'flo',
  'grandma',
  'grandpa',
  'reed',
  'rocko',
  'sandy',
  'shelley',
  'uk english female',
  'uk english male',
  'us english',
]);

export function getBrowserVoiceProvider(name: string, localService: boolean, voiceURI?: string): BrowserVoiceProvider {
  const normalized = name.toLowerCase();
  const normalizedUri = voiceURI?.toLowerCase() ?? '';

  if (
    normalized.startsWith('google ') ||
    normalizedUri.includes('google') ||
    GOOGLE_VOICE_NAMES.has(normalized.trim())
  ) {
    return 'google';
  }
  if (normalized.startsWith('microsoft ') || normalizedUri.includes('microsoft')) return 'microsoft';
  if (
    normalized.startsWith('apple ') ||
    normalizedUri.includes('com.apple') ||
    APPLE_VOICE_NAMES.has(normalized.trim())
  ) {
    return 'apple';
  }
  if (!localService) return 'browser-cloud';
  return 'other';
}

export function getBrowserVoiceType(name: string): BrowserVoiceType {
  const normalized = name.toLowerCase();

  if (normalized.includes('natural') || normalized.includes('neural') || normalized.includes('enhanced')) {
    return 'natural';
  }

  if (NOVELTY_NAME_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return 'novelty';
  }

  return 'standard';
}

export function getBrowserVoiceAccent(lang: string): BrowserVoiceAccent {
  switch (lang.toLowerCase()) {
    case 'en-us':
      return 'us';
    case 'en-gb':
      return 'uk';
    case 'en-au':
      return 'au';
    case 'en-ca':
      return 'ca';
    case 'en-in':
      return 'in';
    case 'en-ie':
      return 'ie';
    case 'en-za':
      return 'za';
    case 'en-nz':
      return 'nz';
    case 'en-sg':
      return 'sg';
    default:
      return lang.toLowerCase().startsWith('en') ? 'other-english' : 'non-english';
  }
}

export function getBrowserVoiceMetadata({
  name,
  lang,
  localService,
  isPremium,
  voiceURI,
}: {
  name: string;
  lang: string;
  localService: boolean;
  isPremium: boolean;
  voiceURI?: string;
}): BrowserVoiceMetadata {
  const provider = getBrowserVoiceProvider(name, localService, voiceURI);
  const voiceType = getBrowserVoiceType(name);
  const accent = getBrowserVoiceAccent(lang);
  const isEnglish = accent !== 'non-english';
  const isFeatured = isEnglish && voiceType !== 'novelty' && (isPremium || provider !== 'other');

  return {
    provider,
    voiceType,
    accent,
    isEnglish,
    isFeatured,
  };
}
