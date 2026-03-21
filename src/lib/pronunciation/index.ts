import type { ProviderConfig, ProviderId } from '@/lib/providers';
import { assessWithAI } from './ai-fallback';
import { assessPronunciation as assessWithSpeechSuper } from './speechsuper';
import type { MonthlyUsage, PronunciationProvider, PronunciationResult, SpeechSuperCredentials } from './types';

export type { PronunciationPhoneme, PronunciationResult, PronunciationWord } from './types';

// ─── Monthly usage tracking ─────────────────────────────────────────────────

const USAGE_KEY = 'echotype_pronunciation_usage';

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthlyUsage(): MonthlyUsage {
  if (typeof window === 'undefined') return { count: 0, month: getCurrentMonth() };
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { count: 0, month: getCurrentMonth() };
    const usage: MonthlyUsage = JSON.parse(raw);
    if (usage.month !== getCurrentMonth()) {
      return { count: 0, month: getCurrentMonth() };
    }
    return usage;
  } catch {
    return { count: 0, month: getCurrentMonth() };
  }
}

function incrementUsage(): void {
  const usage = getMonthlyUsage();
  usage.count += 1;
  usage.month = getCurrentMonth();
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

// ─── Provider orchestrator ──────────────────────────────────────────────────

export interface AssessOptions {
  audio: Blob;
  referenceText: string;
  recognizedText: string;
  provider: PronunciationProvider;
  speechSuperCredentials?: SpeechSuperCredentials;
  monthlyLimit: number;
  aiProviderId: ProviderId;
  aiProviderConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
}

export async function assess(options: AssessOptions): Promise<PronunciationResult> {
  const {
    audio,
    referenceText,
    recognizedText,
    provider,
    speechSuperCredentials,
    monthlyLimit,
    aiProviderId,
    aiProviderConfigs,
  } = options;

  const shouldUseSpeechSuper =
    provider !== 'ai' &&
    speechSuperCredentials?.appKey &&
    speechSuperCredentials?.secretKey &&
    getMonthlyUsage().count < monthlyLimit;

  if (shouldUseSpeechSuper) {
    try {
      const result = await assessWithSpeechSuper(audio, referenceText, speechSuperCredentials!);
      incrementUsage();
      return result;
    } catch (err) {
      console.warn('[Pronunciation] SpeechSuper failed, falling back to AI:', err);
      if (provider === 'speechsuper') {
        throw err; // Don't fall back if explicitly set to speechsuper
      }
    }
  }

  // AI fallback
  return assessWithAI({
    referenceText,
    recognizedText,
    providerId: aiProviderId,
    providerConfigs: aiProviderConfigs,
  });
}
