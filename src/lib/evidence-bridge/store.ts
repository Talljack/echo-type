/*
 * Dexie adapter for the kernel event-store surface.
 *
 * Mirrors store-memory.js semantics over the real IndexedDB table:
 *   append(events) → { appended, deduped }
 *     identical re-delivery dedupes; same id + different content throws
 *     — evidence identity is not last-write-wins.
 *   list() → events sorted by (occurredAt, id) — canonical replay order.
 */
import type { Table } from 'dexie';
import { eventFingerprint } from '@/vnext/store-memory';
import type { EventStore, EvidenceEvent } from './types';

export function createDexieEventStore(table: Table<EvidenceEvent, string>): EventStore {
  return {
    async append(events) {
      let appended = 0;
      let deduped = 0;
      for (const event of events) {
        const existing = await table.get(event.id);
        if (existing) {
          if (eventFingerprint(existing) !== eventFingerprint(event)) {
            throw new Error(
              `event conflict '${event.id}' — same id, different content; refusing to overwrite evidence`,
            );
          }
          deduped++;
          continue;
        }
        await table.add(event);
        appended++;
      }
      return { appended, deduped };
    },
    async list() {
      const events = await table.toArray();
      return events.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    },
  };
}
