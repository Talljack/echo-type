/*
 * DecisionContext (spec §5): a pure, serializable record of the current
 * decision episode. No hidden planner state — the same evidence +
 * curriculum + context + policy must reproduce the same decision.
 *
 * Deliberately excluded: elapsedActiveMs / any fatigue proxy — session
 * fatigue cannot be measured reliably in v0, so nothing fakes it.
 */

const CONTEXT_VERSION = 'vnext.decision-context.v2';

export function emptyContext(decisionEpisodeId = 'ep0', sessionId = 'ses0') {
  return {
    version: CONTEXT_VERSION,
    decisionEpisodeId,
    sessionId,
    actionsChosen: [],        // {kind, capabilityId, taskId, atDecision, decisionId}
    consumedDecisionIds: [],  // idempotency guard for consumeDecision (bounded)
    counts: {
      diagnostic: 0,
      assessment: 0,
      retrieval: 0,
      correction: 0,
      support: 0,
      transfer: 0,
      newInput: 0,
      continuation: 0
    },
    recentCapabilities: [],   // most-recent-last
    recentTaskIds: [],
    lastActedCapabilityId: null,
    currentThreadCapabilityId: null  // pedagogical thread only — see THREAD_OWNERS
  };
}

/* Tolerant load of a persisted context (008C §32): a missing context is
 * NOT initialized here — callers decide when an open run starts fresh.
 * A stored v1 context gains the fields it lacked; unknown shapes fall
 * back to a fresh context stamped with the requested ids rather than
 * guessing at learner history. Never reconstructs fake past decisions. */
export function normalizeContext(raw, decisionEpisodeId = 'ep0', sessionId = 'ses0') {
  if (raw == null || typeof raw !== 'object') return null;
  const base = emptyContext(raw.decisionEpisodeId ?? decisionEpisodeId, raw.sessionId ?? sessionId);
  if (raw.version !== 'vnext.decision-context.v1' && raw.version !== CONTEXT_VERSION) return base;
  return {
    ...base,
    ...raw,
    version: CONTEXT_VERSION,
    actionsChosen: Array.isArray(raw.actionsChosen) ? raw.actionsChosen : [],
    consumedDecisionIds: Array.isArray(raw.consumedDecisionIds) ? raw.consumedDecisionIds : [],
    counts: { ...base.counts, ...(raw.counts ?? {}) },
    recentCapabilities: Array.isArray(raw.recentCapabilities) ? raw.recentCapabilities : [],
    recentTaskIds: Array.isArray(raw.recentTaskIds) ? raw.recentTaskIds : []
  };
}

/* Context snapshot "as of T": rebuild a context whose actions are
 * truncated at occurredAt ≤ t so future actions cannot leak into a
 * historical replay (review BLOCKER 3). */
export function contextAt(ctx, t) {
  if (!ctx) return ctx;
  let rebuilt = { ...emptyContext(ctx.decisionEpisodeId, ctx.sessionId) };
  for (const a of ctx.actionsChosen.filter((a) => a.atDecision != null && a.atDecision <= t)) {
    rebuilt = recordChoice(rebuilt, { kind: a.kind, capabilityId: a.capabilityId, taskId: a.taskId, timestamp: a.atDecision, decisionId: a.decisionId });
  }
  return rebuilt;
}

const COUNT_OF_KIND = {
  diagnostic_probe: 'diagnostic',
  assessment: 'assessment',
  due_retrieval: 'retrieval',
  delayed_retrieval: 'retrieval',
  correction: 'correction',
  retry: 'correction',
  /* 008F: a delayed correction retest is repair-lifecycle work — counted
   * with correction so the episode's tallies stay honest. It is NOT a
   * thread owner (verification ≠ learning thread — same rule as
   * assessment/transfer). */
  correction_retest: 'correction',
  support_demand: 'support',
  transfer: 'transfer',
  new_input: 'newInput',
  expose: 'newInput',
  mission_continuation: 'continuation',
  independent_attempt: 'continuation'
};

/* Kinds that own the pedagogical "learning thread". Interruptions —
 * support substrate probes, due review, transfer checks, assessment —
 * update lastActedCapabilityId but must NOT steal the thread
 * (review MEDIUM-9): hysteresis belongs to what the learner is
 * currently learning, not whatever was served last. */
const THREAD_OWNERS = new Set([
  'mission_continuation', 'new_input', 'independent_attempt',
  'correction', 'refresh', 'diagnostic_probe', 'resume_in_flight'
]);

/* Record a chosen action — returns a NEW context (immutable update so a
 * recorded context is never retro-mutated by later decisions). */
export function recordChoice(ctx, { kind, capabilityId, taskId, timestamp, decisionId = null }) {
  const counts = { ...ctx.counts };
  const bucket = COUNT_OF_KIND[kind];
  if (bucket) counts[bucket] += 1;
  return {
    ...ctx,
    actionsChosen: [...ctx.actionsChosen, { kind, capabilityId, taskId, atDecision: timestamp, decisionId }],
    consumedDecisionIds: decisionId
      ? [...ctx.consumedDecisionIds.filter((id) => id !== decisionId), decisionId].slice(-128)
      : ctx.consumedDecisionIds,
    counts,
    recentCapabilities: capabilityId
      ? [...ctx.recentCapabilities.filter((c) => c !== capabilityId), capabilityId].slice(-8)
      : ctx.recentCapabilities,
    recentTaskIds: taskId
      ? [...ctx.recentTaskIds.filter((t) => t !== taskId), taskId].slice(-16)
      : ctx.recentTaskIds,
    lastActedCapabilityId: capabilityId ?? ctx.lastActedCapabilityId,
    currentThreadCapabilityId: THREAD_OWNERS.has(kind) && capabilityId
      ? capabilityId
      : ctx.currentThreadCapabilityId
  };
}

/* ============ Runtime consumption (008C §8) ============
 *
 * A decision becomes CONSUMED exactly once — when the learner acts on
 * it (exposure view()/continue, or a committed eliciting attempt).
 * Rendering the chosen task any number of times consumes nothing.
 *
 * consumeDecision is idempotent: a second call with the same decisionId
 * returns the unchanged context (a retry/double-delivery never counts
 * twice), and a terminal or taskless decision consumes nothing — the
 * learner could not have acted on it.
 */
export function consumeDecision(ctx, decision, timestamp) {
  const chosen = decision?.chosen;
  const decisionId = decision?.decisionId ?? null;
  if (!chosen || chosen.taskId == null) return { context: ctx, consumed: false, deduped: false };
  if (decisionId && ctx.consumedDecisionIds.includes(decisionId)) {
    return { context: ctx, consumed: false, deduped: true };
  }
  const next = recordChoice(ctx, {
    kind: chosen.kind,
    capabilityId: chosen.capabilityId,
    taskId: `${chosen.taskId}@${chosen.taskRevision ?? 1}`,
    timestamp,
    decisionId
  });
  return { context: next, consumed: true, deduped: false };
}
