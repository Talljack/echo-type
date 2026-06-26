import { toLocalDateKey } from '@/lib/date-key';

export interface WordBookPracticeProgressSnapshot {
  currentIndex: number;
  completedCount: number;
  completedItemIds?: string[];
  itemIds?: string[];
  dayKey?: string;
  finished: boolean;
  updatedAt: number;
}

interface PracticeItem {
  id: string;
}

interface ResolveWordBookPracticeItemsOptions<T extends PracticeItem> {
  availableItems: T[];
  limit: number;
  savedProgress: WordBookPracticeProgressSnapshot | null;
  practicedIds?: ReadonlySet<string>;
  dayKey?: string;
}

interface ResolveWordBookPracticeItemsResult<T extends PracticeItem> {
  items: T[];
  restoredCompletedItemIds: string[];
}

export function canFinishWordBookPractice({
  total,
  completedCount,
}: {
  total: number;
  completedCount: number;
}): boolean {
  return total > 0 && completedCount >= total;
}

export function resolveWordBookPracticeItems<T extends PracticeItem>({
  availableItems,
  limit,
  savedProgress,
  practicedIds,
  dayKey = toLocalDateKey(),
}: ResolveWordBookPracticeItemsOptions<T>): ResolveWordBookPracticeItemsResult<T> {
  if (limit <= 0) {
    const items = availableItems;
    return {
      items,
      restoredCompletedItemIds: restoreCompletedItemIds(items, savedProgress),
    };
  }

  const itemMap = new Map(availableItems.map((item) => [item.id, item]));
  const savedItemIds = Array.isArray(savedProgress?.itemIds) ? savedProgress.itemIds : [];
  const canRestoreSavedItems = savedProgress?.dayKey === dayKey && savedItemIds.length > 0;
  const restoreProgress = canRestoreSavedItems ? savedProgress : null;

  let items: T[];
  if (canRestoreSavedItems) {
    items = savedItemIds.map((id) => itemMap.get(id)).filter((item): item is T => Boolean(item));
  } else {
    const filteredItems =
      practicedIds && practicedIds.size > 0
        ? availableItems.filter((item) => !practicedIds.has(item.id))
        : availableItems;
    items = pickStableDailyItems(filteredItems, limit, dayKey);
  }

  return {
    items,
    restoredCompletedItemIds: restoreCompletedItemIds(items, restoreProgress),
  };
}

function pickStableDailyItems<T extends PracticeItem>(items: T[], limit: number, dayKey: string): T[] {
  if (limit <= 0 || items.length <= limit) {
    return items.slice(0, limit > 0 ? limit : items.length);
  }

  return [...items].sort((a, b) => hashString(`${dayKey}:${a.id}`) - hashString(`${dayKey}:${b.id}`)).slice(0, limit);
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function restoreCompletedItemIds<T extends PracticeItem>(
  items: T[],
  savedProgress: WordBookPracticeProgressSnapshot | null,
): string[] {
  if (!savedProgress || items.length === 0) {
    return [];
  }

  const itemIds = new Set(items.map((item) => item.id));
  const restoredCompletedIds = Array.isArray(savedProgress.completedItemIds)
    ? savedProgress.completedItemIds.filter((id) => itemIds.has(id)).slice(0, items.length)
    : [];

  if (restoredCompletedIds.length > 0) {
    return restoredCompletedIds;
  }

  const safeCompletedCount = Math.min(Math.max(savedProgress.completedCount, 0), items.length);
  return items.slice(0, safeCompletedCount).map((item) => item.id);
}
