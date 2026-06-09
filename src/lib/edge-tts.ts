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
let cachedVoiceSource: 'remote' | 'fallback' | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000;
const VOICE_FETCH_TIMEOUT_MS = 4_000;
const MIN_SYNTHESIS_TIMEOUT_MS = 15_000;
const MAX_SYNTHESIS_TIMEOUT_MS = 60_000;
const SYNTHESIS_TIMEOUT_BASE_MS = 4_000;
const SYNTHESIS_TIMEOUT_PER_WORD_MS = 140;
const MAX_SYNTHESIS_CHUNK_WORDS = 20;
const MAX_SYNTHESIS_CHUNK_CHARS = 260;
const ESTIMATED_WORDS_PER_SECOND = 2.5;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getSynthesisTimeoutMs(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMs = SYNTHESIS_TIMEOUT_BASE_MS + wordCount * SYNTHESIS_TIMEOUT_PER_WORD_MS;
  return Math.min(MAX_SYNTHESIS_TIMEOUT_MS, Math.max(MIN_SYNTHESIS_TIMEOUT_MS, estimatedMs));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitOversizedSentence(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const word of words) {
    const nextChars = currentChars + word.length + (current.length > 0 ? 1 : 0);
    if (current.length > 0 && (current.length >= MAX_SYNTHESIS_CHUNK_WORDS || nextChars > MAX_SYNTHESIS_CHUNK_CHARS)) {
      chunks.push(current.join(' '));
      current = [];
      currentChars = 0;
    }
    current.push(word);
    currentChars += word.length + (current.length > 1 ? 1 : 0);
  }

  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return chunks;
}

export function splitEdgeSynthesisText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const sentenceMatches =
    normalized
      .match(/[^.!?。！？]+[.!?。！？]+["')\]]*|[^.!?。！？]+$/g)
      ?.map((part) => part.trim())
      .filter(Boolean) ?? [];
  const parts = sentenceMatches.length > 0 ? sentenceMatches : [normalized];
  const chunks: string[] = [];
  let current = '';
  let currentWords = 0;

  for (const part of parts) {
    const partWords = countWords(part);
    if (partWords > MAX_SYNTHESIS_CHUNK_WORDS || part.length > MAX_SYNTHESIS_CHUNK_CHARS) {
      if (current) {
        chunks.push(current);
        current = '';
        currentWords = 0;
      }
      chunks.push(...splitOversizedSentence(part));
      continue;
    }

    const next = current ? `${current} ${part}` : part;
    const nextWords = currentWords + partWords;
    if (current && (nextWords > MAX_SYNTHESIS_CHUNK_WORDS || next.length > MAX_SYNTHESIS_CHUNK_CHARS)) {
      chunks.push(current);
      current = part;
      currentWords = partWords;
      continue;
    }

    current = next;
    currentWords = nextWords;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

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
  const cacheTtl = cachedVoiceSource === 'fallback' ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS;
  if (cachedVoices && Date.now() - cacheTimestamp < cacheTtl) {
    return cachedVoices;
  }

  try {
    const manager = await withTimeout(
      VoicesManager.create(),
      VOICE_FETCH_TIMEOUT_MS,
      'Edge voice list request timed out.',
    );
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
    cachedVoiceSource = 'remote';
    return voices;
  } catch {
    if (cachedVoices) return cachedVoices;
    cachedVoices = FALLBACK_VOICES;
    cacheTimestamp = Date.now();
    cachedVoiceSource = 'fallback';
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
  const chunks = splitEdgeSynthesisText(text);
  const audioBuffers: Buffer[] = [];
  const wordBoundaries: EdgeWordBoundary[] = [];
  let timeOffset = 0;

  for (const chunk of chunks) {
    const tts = new EdgeTTS(chunk, voice, { rate: rateStr });
    const result = await withTimeout(tts.synthesize(), getSynthesisTimeoutMs(chunk), 'Edge TTS synthesis timed out.');

    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
    audioBuffers.push(audioBuffer);

    const HNS_PER_SEC = 10_000_000;
    const chunkBoundaries = result.subtitle.map((wb) => ({
      word: wb.text,
      start: wb.offset / HNS_PER_SEC,
      end: (wb.offset + wb.duration) / HNS_PER_SEC,
    }));
    wordBoundaries.push(
      ...chunkBoundaries.map((boundary) => ({
        word: boundary.word,
        start: boundary.start + timeOffset,
        end: boundary.end + timeOffset,
      })),
    );

    const estimatedDuration = Math.max(0.4, countWords(chunk) / Math.max(0.5, ESTIMATED_WORDS_PER_SECOND * speed));
    const chunkDuration = chunkBoundaries.at(-1)?.end ?? estimatedDuration;
    timeOffset += chunkDuration;
  }

  return {
    audioBuffer: Buffer.concat(audioBuffers),
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
