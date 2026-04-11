import { db } from '@/lib/db';
import type { WordTimestamp } from '@/lib/word-alignment';

function buildCacheKey(contentId: string, voiceId: string, speed: number): string {
  return `${contentId}:${voiceId}:${speed}`;
}

export async function getAlignmentCache(
  contentId: string,
  voiceId: string,
  speed: number,
): Promise<{ timestamps: WordTimestamp[]; duration: number } | null> {
  try {
    const key = buildCacheKey(contentId, voiceId, speed);
    const entry = await db.alignmentCache.get(key);
    if (!entry) return null;
    return { timestamps: entry.timestamps, duration: entry.duration };
  } catch {
    return null;
  }
}

export async function setAlignmentCache(
  contentId: string,
  voiceId: string,
  speed: number,
  timestamps: WordTimestamp[],
  duration: number,
): Promise<void> {
  try {
    const key = buildCacheKey(contentId, voiceId, speed);
    await db.alignmentCache.put({
      cacheKey: key,
      timestamps,
      duration,
      createdAt: Date.now(),
    });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function clearAlignmentCache(): Promise<void> {
  await db.alignmentCache.clear();
}
