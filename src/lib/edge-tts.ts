import { EdgeTTS, type Voice, VoicesManager } from 'edge-tts-universal';

export interface EdgeTTSVoice {
  id: string;
  name: string;
  shortName: string;
  locale: string;
  gender: string;
  personalities?: string[];
}

let cachedVoices: EdgeTTSVoice[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeVoice(v: Voice): EdgeTTSVoice {
  const match = v.ShortName.match(/^[\w-]+-(\w+?)(Multilingual|Expressive)?Neural$/);
  const baseName = match?.[1] ?? v.ShortName;
  const suffix = match?.[2];
  const displayName = suffix ? `${baseName} (${suffix})` : baseName;

  return {
    id: v.ShortName,
    name: displayName,
    shortName: v.ShortName,
    locale: v.Locale,
    gender: v.Gender,
    personalities: v.VoiceTag?.VoicePersonalities,
  };
}

export async function listEdgeVoices(): Promise<EdgeTTSVoice[]> {
  if (cachedVoices && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedVoices;
  }

  try {
    const manager = await VoicesManager.create();
    const englishVoices = manager.find({ Language: 'en' });
    const voices = englishVoices.map(normalizeVoice);
    voices.sort((a, b) => {
      const localeOrder = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-IE'];
      const aIdx = localeOrder.indexOf(a.locale);
      const bIdx = localeOrder.indexOf(b.locale);
      const aPriority = aIdx === -1 ? localeOrder.length : aIdx;
      const bPriority = bIdx === -1 ? localeOrder.length : bIdx;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (a.gender !== b.gender) return a.gender === 'Female' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    cachedVoices = voices;
    cacheTimestamp = Date.now();
    return voices;
  } catch {
    if (cachedVoices) return cachedVoices;
    return FALLBACK_VOICES;
  }
}

export interface EdgeWordBoundary {
  word: string;
  start: number;
  end: number;
}

export async function synthesizeEdgeSpeech({
  text,
  voice,
  speed = 1.0,
}: {
  text: string;
  voice: string;
  speed?: number;
}): Promise<{ audioBuffer: Buffer; contentType: string; wordBoundaries: EdgeWordBoundary[] }> {
  const ratePercent = Math.round((speed - 1) * 100);
  const rateStr = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;

  const tts = new EdgeTTS(text, voice, { rate: rateStr });
  const result = await tts.synthesize();

  const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

  const HNS_PER_SEC = 10_000_000;
  const wordBoundaries: EdgeWordBoundary[] = result.subtitle.map((wb) => ({
    word: wb.text,
    start: wb.offset / HNS_PER_SEC,
    end: (wb.offset + wb.duration) / HNS_PER_SEC,
  }));

  return {
    audioBuffer,
    contentType: 'audio/mpeg',
    wordBoundaries,
  };
}

const FALLBACK_VOICES: EdgeTTSVoice[] = [
  { id: 'en-US-AriaNeural', name: 'Aria', shortName: 'en-US-AriaNeural', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-JennyNeural', name: 'Jenny', shortName: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy', shortName: 'en-US-GuyNeural', locale: 'en-US', gender: 'Male' },
  {
    id: 'en-US-MichelleNeural',
    name: 'Michelle',
    shortName: 'en-US-MichelleNeural',
    locale: 'en-US',
    gender: 'Female',
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher',
    shortName: 'en-US-ChristopherNeural',
    locale: 'en-US',
    gender: 'Male',
  },
  { id: 'en-US-EricNeural', name: 'Eric', shortName: 'en-US-EricNeural', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', shortName: 'en-US-SteffanNeural', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-AnaNeural', name: 'Ana', shortName: 'en-US-AnaNeural', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-AndrewNeural', name: 'Andrew', shortName: 'en-US-AndrewNeural', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-AvaNeural', name: 'Ava', shortName: 'en-US-AvaNeural', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-BrianNeural', name: 'Brian', shortName: 'en-US-BrianNeural', locale: 'en-US', gender: 'Male' },
  {
    id: 'en-US-EmmaMultilingualNeural',
    name: 'Emma',
    shortName: 'en-US-EmmaMultilingualNeural',
    locale: 'en-US',
    gender: 'Female',
  },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', shortName: 'en-GB-SoniaNeural', locale: 'en-GB', gender: 'Female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', shortName: 'en-GB-RyanNeural', locale: 'en-GB', gender: 'Male' },
  { id: 'en-GB-LibbyNeural', name: 'Libby', shortName: 'en-GB-LibbyNeural', locale: 'en-GB', gender: 'Female' },
  { id: 'en-GB-MaisieNeural', name: 'Maisie', shortName: 'en-GB-MaisieNeural', locale: 'en-GB', gender: 'Female' },
  { id: 'en-GB-ThomasNeural', name: 'Thomas', shortName: 'en-GB-ThomasNeural', locale: 'en-GB', gender: 'Male' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha', shortName: 'en-AU-NatashaNeural', locale: 'en-AU', gender: 'Female' },
  { id: 'en-AU-WilliamNeural', name: 'William', shortName: 'en-AU-WilliamNeural', locale: 'en-AU', gender: 'Male' },
  { id: 'en-CA-ClaraNeural', name: 'Clara', shortName: 'en-CA-ClaraNeural', locale: 'en-CA', gender: 'Female' },
  { id: 'en-CA-LiamNeural', name: 'Liam', shortName: 'en-CA-LiamNeural', locale: 'en-CA', gender: 'Male' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', shortName: 'en-IN-NeerjaNeural', locale: 'en-IN', gender: 'Female' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', shortName: 'en-IN-PrabhatNeural', locale: 'en-IN', gender: 'Male' },
  { id: 'en-IE-EmilyNeural', name: 'Emily', shortName: 'en-IE-EmilyNeural', locale: 'en-IE', gender: 'Female' },
  { id: 'en-IE-ConnorNeural', name: 'Connor', shortName: 'en-IE-ConnorNeural', locale: 'en-IE', gender: 'Male' },
];
