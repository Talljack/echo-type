import * as Speech from 'expo-speech';
import { type EdgeVoice, getEdgeTTSVoices } from '@/services/tts-api';

export type VoiceSource = 'device' | 'edge';

export type VoiceGender = 'male' | 'female' | 'unknown';

export interface UnifiedVoice {
  id: string;
  name: string;
  language: string;
  gender: VoiceGender;
  source: VoiceSource;
  description?: string;
  preview?: string;
}

/** Detect a voice id's source by shape. Edge ids always end in `...Neural`. */
export function getVoiceSource(voiceId: string): VoiceSource {
  return /Neural$/i.test(voiceId) ? 'edge' : 'device';
}

export function previewTextForLocale(locale: string): string {
  const lower = locale.toLowerCase();
  if (lower.startsWith('zh')) return '你好！这是我的声音。';
  if (lower.startsWith('ja')) return 'こんにちは、これが私の声です。';
  if (lower.startsWith('ko')) return '안녕하세요, 이것이 제 목소리입니다.';
  if (lower.startsWith('es')) return 'Hola, así es como sueno.';
  if (lower.startsWith('fr')) return 'Bonjour, voici ma voix.';
  if (lower.startsWith('de')) return 'Hallo, so klinge ich.';
  return 'Hello! This is how I sound.';
}

function normalizeGender(raw: string | undefined): VoiceGender {
  const g = (raw ?? '').toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return 'unknown';
}

/** Human-friendly display like "Aria (en-US)". */
function edgeDisplayName(v: EdgeVoice): string {
  return `${v.name} (${v.locale})`;
}

function normalizeEdgeVoice(v: EdgeVoice): UnifiedVoice {
  return {
    id: v.shortName || v.id,
    name: edgeDisplayName(v),
    language: v.locale,
    gender: normalizeGender(v.gender),
    source: 'edge',
    description: v.personalities?.length ? v.personalities.join(' · ') : undefined,
    preview: previewTextForLocale(v.locale),
  };
}

function normalizeDeviceVoice(v: Speech.Voice): UnifiedVoice {
  const language = (v.language ?? 'en-US').replace(/_/g, '-');
  const name = v.name && v.name.length > 0 ? v.name : v.identifier;
  const quality = (v as { quality?: string }).quality;
  return {
    id: v.identifier,
    name,
    language,
    gender: 'unknown',
    source: 'device',
    description: quality ? quality : undefined,
    preview: previewTextForLocale(language),
  };
}

export async function loadEdgeVoices(): Promise<UnifiedVoice[]> {
  const raw = await getEdgeTTSVoices();
  return raw.map(normalizeEdgeVoice);
}

export async function loadDeviceVoices(): Promise<UnifiedVoice[]> {
  try {
    const raw = await Speech.getAvailableVoicesAsync();
    const seen = new Set<string>();
    const out: UnifiedVoice[] = [];
    for (const v of raw) {
      if (!v.identifier || seen.has(v.identifier)) continue;
      seen.add(v.identifier);
      out.push(normalizeDeviceVoice(v));
    }
    out.sort((a, b) => {
      const langCmp = a.language.localeCompare(b.language);
      return langCmp !== 0 ? langCmp : a.name.localeCompare(b.name);
    });
    return out;
  } catch {
    return [];
  }
}

export interface VoiceCatalogResult {
  device: UnifiedVoice[];
  edge: UnifiedVoice[];
  edgeError: string | null;
}

export async function loadAllVoices(): Promise<VoiceCatalogResult> {
  const [deviceSettled, edgeSettled] = await Promise.allSettled([loadDeviceVoices(), loadEdgeVoices()]);
  const device = deviceSettled.status === 'fulfilled' ? deviceSettled.value : [];
  const edge = edgeSettled.status === 'fulfilled' ? edgeSettled.value : [];
  const edgeError = edgeSettled.status === 'rejected' ? (edgeSettled.reason as Error).message : null;
  return { device, edge, edgeError };
}

export function findVoice(voices: UnifiedVoice[], id: string): UnifiedVoice | undefined {
  return voices.find((v) => v.id === id);
}
