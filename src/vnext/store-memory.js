/*
 * vNext in-memory stores (issue #55).
 *
 * The session controller talks to two store shapes so the same contract
 * stack runs headless in tests, against localStorage in the dev page,
 * or against Firestore via persist.js:
 *
 *   eventStore.append(events) → { appended, deduped }
 *       identical re-delivery dedupes; same id + different content
 *       throws — evidence identity is not last-write-wins.
 *   eventStore.list() → events sorted (occurredAt, id)
 *
 *   runStore.getOpenRun(learnerId, missionId) → run | null
 *   runStore.saveRun(run) → run
 *
 * Runs are bookkeeping (status changes), not evidence — the mutable run
 * record never lives inside the append-only event log.
 */

const FINGERPRINT_FIELDS = [
  'id', 'learnerId', 'capabilityId', 'taskId', 'taskRevision', 'eventType',
  'modality', 'occurredAt', 'context', 'attempt', 'support', 'feedback',
  'evaluation', 'binding', 'missionRunId'
];

export function eventFingerprint(event) {
  return JSON.stringify(FINGERPRINT_FIELDS.map((k) => [k, event?.[k] ?? null]));
}

export function createMemoryEventStore(seed = []) {
  const byId = new Map();
  const store = {
    async append(events) {
      let appended = 0;
      let deduped = 0;
      for (const event of events) {
        const existing = byId.get(event.id);
        if (existing) {
          if (eventFingerprint(existing) !== eventFingerprint(event)) {
            throw new Error(`event conflict '${event.id}' — same id, different content; refusing to overwrite evidence`);
          }
          deduped++;
          continue;
        }
        byId.set(event.id, event);
        appended++;
      }
      return { appended, deduped };
    },
    async list() {
      return [...byId.values()].sort(
        (a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
    },
    async clear() { byId.clear(); }
  };
  if (seed.length) {
    for (const e of seed) byId.set(e.id, e);
  }
  return store;
}

export function createMemoryRunStore(seed = []) {
  const byId = new Map();
  /* HIGH-4: every boundary deep-clones — mutating a returned run must
   * never silently edit "persisted" state without a saveRun call. A
   * shared `run.selection` reference would let tests pass while real
   * persistence was broken. */
  for (const r of seed) byId.set(r.id, structuredClone(r));
  return {
    async getOpenRun(learnerId, missionId) {
      const open = [...byId.values()]
        .filter((r) => r.learnerId === learnerId && r.missionId === missionId && r.status === 'open')
        .sort((a, b) => a.startedAt - b.startedAt || (a.id < b.id ? -1 : 1));
      const r = open[open.length - 1] ?? null;
      return r ? structuredClone(r) : null;
    },
    async getRun(runId) {
      const r = byId.get(runId);
      return r ? structuredClone(r) : null;
    },
    async saveRun(run) {
      byId.set(run.id, structuredClone(run));
      return structuredClone(byId.get(run.id));
    },
    async list(learnerId) {
      return [...byId.values()]
        .filter((r) => !learnerId || r.learnerId === learnerId)
        .map((r) => structuredClone(r));
    }
  };
}

/* 008C §11: consumed-decision audit store — append-only, keyed by
 * decisionId. Same rules as the event store: identical re-delivery
 * dedupes; same id + different content is a conflict, never a rewrite.
 * Records are compact provenance — no learner snapshots, no response
 * text. */
const DECISION_FINGERPRINT_FIELDS = [
  'decisionId', 'learnerId', 'missionId', 'missionRevision', 'taskId',
  'taskRevision', 'capabilityId', 'selectionPolicyVersion',
  'learningPolicyVersion', 'decisionInputDigest', 'decisionEpisodeId',
  'sessionId', 'chosenKind', 'timestamp', 'reasonCodes', 'shadow',
  'contextVersion'
];

export function decisionFingerprint(record) {
  return JSON.stringify(DECISION_FINGERPRINT_FIELDS.map((k) => [k, record?.[k] ?? null]));
}

export function createMemoryDecisionStore(seed = []) {
  const byId = new Map();
  for (const r of seed) byId.set(r.decisionId, r);
  return {
    async append(record) {
      const existing = byId.get(record.decisionId);
      if (existing) {
        if (decisionFingerprint(existing) !== decisionFingerprint(record)) {
          throw new Error(`decision conflict '${record.decisionId}' — same id, different content; refusing to overwrite audit`);
        }
        return { appended: 0, deduped: 1 };
      }
      byId.set(record.decisionId, record);
      return { appended: 1, deduped: 0 };
    },
    async list(learnerId) {
      return [...byId.values()]
        .filter((r) => !learnerId || r.learnerId === learnerId)
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.decisionId < b.decisionId ? -1 : 1));
    },
    async clear() { byId.clear(); }
  };
}
