import { db } from '@/lib/db';
import { normalizeText } from '@/lib/text-normalize';
import { useFavoriteStore } from '@/stores/favorite-store';
import { type AutoCollectSensitivity, SENSITIVITY_THRESHOLDS } from '@/types/favorite';

export function shouldAutoCollectByLookup(count: number, sensitivity: AutoCollectSensitivity): boolean {
  return count >= SENSITIVITY_THRESHOLDS[sensitivity].lookupCount;
}

export function shouldAutoCollectByWriteErrors(errorRate: number, sensitivity: AutoCollectSensitivity): boolean {
  return errorRate >= SENSITIVITY_THRESHOLDS[sensitivity].writeErrorRate;
}

export function shouldAutoCollectByFSRSAgain(
  consecutiveAgainCount: number,
  sensitivity: AutoCollectSensitivity,
): boolean {
  return consecutiveAgainCount >= SENSITIVITY_THRESHOLDS[sensitivity].fsrsAgainCount;
}

export async function getTodayAutoCollectCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStart = startOfDay.getTime();

  const count = await db.favorites
    .where('autoCollected')
    .equals(1) // Dexie stores booleans as 0/1 in indexes
    .filter((f) => f.createdAt >= todayStart)
    .count();

  return count;
}

export async function tryAutoCollect(
  text: string,
  translation: string,
  type: 'word' | 'phrase' | 'sentence',
  targetLang: string,
  sourceModule?: string,
  sourceContentId?: string,
): Promise<boolean> {
  const store = useFavoriteStore.getState();
  const { autoCollectSettings } = store;

  if (!autoCollectSettings.enabled) return false;
  if (store.isFavorited(text)) return false;

  const todayCount = await getTodayAutoCollectCount();
  if (todayCount >= autoCollectSettings.dailyCap) return false;

  await store.addFavorite({
    text,
    translation,
    type,
    folderId: 'auto',
    targetLang,
    sourceModule: sourceModule as any,
    sourceContentId,
    autoCollected: true,
  });

  return true;
}

/**
 * Check lookup history and auto-collect if threshold met.
 * Called after each translation lookup.
 */
export async function checkLookupAutoCollect(
  text: string,
  translation: string,
  type: 'word' | 'phrase' | 'sentence',
  targetLang: string,
  sourceModule?: string,
): Promise<void> {
  const store = useFavoriteStore.getState();
  if (!store.autoCollectSettings.enabled) return;

  const normalized = normalizeText(text);
  const entry = await db.lookupHistory.get(normalized);
  if (!entry) return;

  if (shouldAutoCollectByLookup(entry.count, store.autoCollectSettings.sensitivity)) {
    await tryAutoCollect(text, translation, type, targetLang, sourceModule);
  }
}
