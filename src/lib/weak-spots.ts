import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import type { WeakSpot, WeakSpotType } from '@/types/weak-spot';

export function normalizeWeakSpotText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface UpsertWeakSpotInput {
  module: WeakSpot['module'];
  weakSpotType: WeakSpotType;
  sourceId: string;
  sourceType: WeakSpot['sourceType'];
  text: string;
  reason: string;
  targetHref: string;
  accuracy?: number;
}

interface ResolveWeakSpotInput {
  module: WeakSpot['module'];
  weakSpotType: WeakSpotType;
  text: string;
  accuracy?: number;
}

export async function upsertWeakSpot(input: UpsertWeakSpotInput) {
  const normalizedText = normalizeWeakSpotText(input.text);
  const existing = await db.weakSpots
    .where('[module+weakSpotType+normalizedText]')
    .equals([input.module, input.weakSpotType, normalizedText])
    .first();

  if (existing) {
    await db.weakSpots.update(existing.id, {
      count: existing.count + 1,
      lastSeenAt: Date.now(),
      accuracy: input.accuracy ?? existing.accuracy,
      reason: input.reason,
      targetHref: input.targetHref,
      resolved: false,
    });
    return existing.id;
  }

  const id = nanoid();
  await db.weakSpots.add({
    id,
    ...input,
    normalizedText,
    count: 1,
    lastSeenAt: Date.now(),
    resolved: false,
  });
  return id;
}

export async function resolveWeakSpot(input: ResolveWeakSpotInput) {
  const normalizedText = normalizeWeakSpotText(input.text);
  const existing = await db.weakSpots
    .where('[module+weakSpotType+normalizedText]')
    .equals([input.module, input.weakSpotType, normalizedText])
    .first();

  if (!existing) return null;

  await db.weakSpots.update(existing.id, {
    resolved: true,
    accuracy: input.accuracy ?? existing.accuracy,
    lastSeenAt: Date.now(),
  });

  return existing.id;
}

export async function getOpenWeakSpots() {
  const items = await db.weakSpots.toArray();
  return items.filter((item) => !item.resolved).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}
