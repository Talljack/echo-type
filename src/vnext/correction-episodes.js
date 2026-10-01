/*
 * vNext correction episodes (Mission 008F) — pure replay-derived state.
 *
 * The kernel today can show FAILED → REPAIR → "did it right after
 * correction". B0 treats that remediation success as permission to move
 * on to transfer/assessment. The evidence does not support that reading:
 * immediate post-correction performance is *working* knowledge, and only
 * a successful INDEPENDENT retest after a meaningful delay verifies the
 * correction (docs/research/next-for-you/14-correction-episodes.md).
 *
 * This module derives the episode lifecycle from the append-only event
 * log — never stored, always recomputed:
 *
 *   OPEN              authoritative attributed failure on a TAUGHT cap
 *   REPAIRING         a remediation-purpose attempt seen (any outcome)
 *   REPAIRED_WAITING  an independent success covering ≥1 missing function
 *                     (any non-support surface — a demonstrated recovery
 *                     is the repair, matching the demand lifecycle's rule)
 *   RETEST_DUE        REPAIRED_WAITING with now ≥ repairedAt + lag
 *   VERIFIED          every missing function independently demonstrated
 *                     post-lag on a retest-eligible surface — terminal
 *   RELAPSED          a new authoritative failure while waiting/due
 *                     → repair path returns; lag restarts at the new
 *                     repairedAt
 *
 * Hard boundaries (same bar the projection/learner-model enforce):
 *   - only VERIFIED events count — the task must resolve to a registered
 *     taskId@revision and pass verifyEventTask (stale revisions, forged
 *     bindings, wrong learners and modality mismatches are context,
 *     never episode evidence);
 *   - an episode opens ONLY on an observed fail/partial under an
 *     attributing contract (contractAttributesFunctions) with a
 *     non-empty missingFunctions ∩ requiredFunctions — a non-attributing
 *     miss is information, never a repairable episode (Mission 007);
 *   - episodes open only on capabilities that were TAUGHT before the
 *     failure (a prior verified success at any support level) — a
 *     baseline probe miss is information, not a broken ability;
 *   - supported/unobserved successes neither repair nor verify;
 *   - a retest surface must differ from EVERY failure surface recorded
 *     in the episode (the opening source task AND any retest that
 *     itself failed — reselling a failed item is not an independent
 *     retest) and from every remediation task consumed in the episode,
 *     and must declare the still-missing function it claims to retest;
 *   - the lag is the SAME named policy constant as retention
 *     (policy.retention.minLagMs) — B1 invents no second delay number;
 *   - VERIFIED is terminal — a later attributed failure opens a NEW
 *     episode; one open episode per capability at a time;
 *   - canonical order is (occurredAt, id): replay of the same event set
 *     is byte-identical regardless of delivery order or resyncs.
 *
 * Mission 008G boundary: this module is EVIDENCE TRUTH only — which
 * episodes exist, which functions remain missing, which surfaces are
 * burned, what state each episode is in. Whether the serving mission can
 * still repair an open episode (and therefore whether fresh retest
 * surfaces may be withheld) is ROUTING TRUTH, proven per-mission in
 * next-for-you/repair-proof.js — never inferred from the full task
 * registry here.
 */
import { answerBearing, conditionsViolated, unionSupport } from './evidence.js';
import { effectiveAllowedSupport, verifyEventTask } from './contracts.js';
import { contractAttributesFunctions } from './evaluators.js';
import { resolvePolicy } from './policy.js';
import { sha256 } from './next-for-you/canonical.js';

export const CORRECTION_EPISODES_VERSION = 'vnext.correction-episodes.v1';

export const EPISODE_STATES = Object.freeze([
  'OPEN', 'REPAIRING', 'REPAIRED_WAITING', 'RETEST_DUE', 'VERIFIED', 'RELAPSED'
]);

/* Unresolved = gates certification intents (transfer/assessment) under
 * B1. VERIFIED is the only resolved terminal; the episode set itself is
 * append-only history. */
const UNRESOLVED = new Set(['OPEN', 'REPAIRING', 'REPAIRED_WAITING', 'RETEST_DUE', 'RELAPSED']);

/* Purposes that may serve as delayed-retest surfaces — independent
 * eliciting work on the target capability. `remediation` is excluded by
 * design (a repair task can never be its own retest), `support` by
 * contract (support_attempt is not ability evidence), `transfer` and
 * `assessment` because episodes GATE them, `diagnostic` because a probe
 * is information, not retained-performance evidence. */
export const RETEST_PURPOSES = Object.freeze([
  'delayed_retrieval', 'retrieval', 'production', 'interaction'
]);

const ATTEMPT_TYPES = new Set([
  'recognition_attempt', 'recall_attempt', 'production_attempt',
  'interaction_turn', 'retry', 'delayed_retrieval',
  'transfer_attempt', 'checkpoint'
]);
const INDEPENDENT_AUTHORITIES = new Set(['deterministic', 'human']);
const isSuccess = (e) => e.attempt?.outcome === 'success';
const isMiss = (e) => e.attempt?.outcome === 'fail' || e.attempt?.outcome === 'partial';

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

function newEpisode(learnerId, e, missing) {
  return {
    /* Identity is provenance-bound — a canonical digest of the learner,
     * the capability and the immutable opening-failure record — never an
     * ordinal. The same failure replays to the same id under any event
     * order or historical insertion, and two learners can never share
     * an episode id. */
    episodeId: `cep:${sha256({
      learnerId,
      capabilityId: e.capabilityId,
      sourceEventId: e.id,
      sourceTaskId: e.taskId ?? null,
      sourceTaskRevision: e.taskRevision ?? null,
      openedAt: e.occurredAt
    }).slice(0, 20)}`,
    learnerId,
    capabilityId: e.capabilityId,
    state: 'OPEN',
    openedAt: e.occurredAt,
    sourceEventId: e.id,
    sourceTaskId: e.taskId,
    sourceTaskRevision: e.taskRevision,
    /* The union of every function this episode's failures attributed —
     * a relapse may WIDEN the gap, never narrow it. */
    missingFunctions: [...missing].sort(),
    failures: [{
      eventId: e.id, taskId: e.taskId, taskRevision: e.taskRevision,
      at: e.occurredAt, missingFunctions: [...missing].sort()
    }],
    repairAttempts: 0,
    /* remediation-purpose tasks consumed by this episode. */
    repairTaskIds: [],
    /* EVERY independent covering surface whose success established or
     * re-established repair — any purpose. A repair surface is exposed
     * evidence, never a fresh delayed probe. */
    repairSurfaceTaskIds: [],
    /* Retest-eligible surfaces already practiced during the lag —
     * exposed probes cannot double as the delayed retest. */
    practicedRetestTaskIds: [],
    repairedAt: null,
    retestDueAt: null,
    /* fn → { at, eventId } — post-lag demonstrated functions; VERIFIED
     * requires every missing function covered here. */
    verifiedFunctions: {},
    /* Post-repair covering successes that arrived BEFORE the lag —
     * valid practice, invalid verification (kept for transparency). */
    earlyRetestAttempts: 0,
    relapseCount: 0,
    lastRelapseAt: null,
    verifiedAt: null,
    verifiedByEventId: null
  };
}

/* Functions this episode still owes post-lag proof for — the retest
 * surface must cover at least one; VERIFIED requires zero remaining. */
export const remainingOf = (ep) =>
  ep.missingFunctions.filter((f) => ep.verifiedFunctions[f] == null);

/* Every task surface this episode already burned: each failure surface
 * (opening miss + any failed retest), every remediation task consumed,
 * every surface whose success established repair, and every retest-
 * eligible surface practiced during the lag. None may come back as the
 * "independent fresh" retest. */
export const burnedSurfaces = (ep) => {
  const used = new Set((ep.failures ?? []).map((f) => f.taskId));
  for (const id of ep.repairTaskIds ?? []) used.add(id);
  for (const id of ep.repairSurfaceTaskIds ?? []) used.add(id);
  for (const id of ep.practicedRetestTaskIds ?? []) used.add(id);
  return used;
};
const usedSurfaces = burnedSurfaces;

/* The retest surfaces a B1 retest candidate may serve: same capability,
 * a retest-eligible purpose, no burned surface (failure or repair), and
 * covering at least one still-missing function. */
export function retestSurfaces(episode, tasks) {
  const used = usedSurfaces(episode);
  return (tasks ?? []).filter((t) =>
    t.capabilityId === episode.capabilityId &&
    RETEST_PURPOSES.includes(t.purpose) &&
    !used.has(t.id) &&
    (t.response?.requiredFunctions ?? []).some((f) => remainingOf(episode).includes(f)));
}

/* Deterministic retest pick: the canonical delayed-check surface first
 * (delayed_retrieval is the purpose authored for exactly this), then
 * lexicographic task id — same inputs, same choice. */
export function pickRetestSurface(episode, tasks) {
  const surfaces = retestSurfaces(episode, tasks);
  if (!surfaces.length) return null;
  const delayed = surfaces.filter((t) => t.purpose === 'delayed_retrieval');
  const pool = delayed.length ? delayed : surfaces;
  return [...pool].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
}

export function deriveCorrectionEpisodes({ learnerId, events, capabilities, tasks, policy, now = null }) {
  if (typeof learnerId !== 'string' || !learnerId) {
    throw new Error('deriveCorrectionEpisodes requires a learnerId');
  }
  if (!Array.isArray(tasks)) {
    throw new Error('deriveCorrectionEpisodes requires the registered task list');
  }
  const pol = resolvePolicy(policy);
  const lag = pol.retention.minLagMs;

  const taskByRev = new Map();
  for (const t of tasks) {
    const k = keyOf(t);
    if (taskByRev.has(k)) throw new Error(`duplicate task registration '${k}'`);
    taskByRev.set(k, t);
  }
  const capById = new Map(capabilities.map((c) => [c.id, c]));

  // Canonical replay — the projection's own order: learner-scoped,
  // id-deduped, (occurredAt, id)-sorted. Arrival order never matters.
  const seenIds = new Set();
  const mine = [];
  for (const e of events) {
    if (e.learnerId !== learnerId || seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    mine.push(e);
  }
  mine.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const supportByAttempt = new Map();
  const taught = new Set();          // caps with ≥1 verified success (any aid)
  const openByCap = new Map();       // capabilityId → live episode
  const episodes = [];

  for (const e of mine) {
    const cap = capById.get(e.capabilityId);
    if (!cap || e.modality !== cap.modality) continue;
    const task = taskByRev.get(keyOf({ id: e.taskId, revision: e.taskRevision }));
    if (!task || !verifyEventTask(e, task, cap)) continue;

    // Support accumulates across the attempt boundary — same rule the
    // projection and learner model apply, or the independence bar here
    // would disagree with theirs.
    const aid = e.attempt?.attemptId;
    let effSupport = e.support;
    if (aid) {
      const key = `${e.taskId}::${aid}`;
      effSupport = unionSupport(supportByAttempt.get(key) ?? null, e.support);
      supportByAttempt.set(key, effSupport);
    }

    if (!ATTEMPT_TYPES.has(e.eventType) || e.attempt?.outcome == null) continue;

    const independent = isSuccess(e) &&
      e.attempt?.observed === true &&
      !answerBearing(effSupport) &&
      !conditionsViolated(effSupport, effectiveAllowedSupport(cap, task)) &&
      INDEPENDENT_AUTHORITIES.has(e.evaluation?.authority);

    const ep = openByCap.get(e.capabilityId);

    /* A remediation-purpose attempt is a repair attempt regardless of
     * outcome — including a failed one. Count it BEFORE the failure
     * branch's continue so repair progress stays honest. */
    if (ep && task.purpose === 'remediation') {
      ep.repairAttempts += 1;
      if (!ep.repairTaskIds.includes(task.id)) ep.repairTaskIds.push(task.id);
      if (ep.state === 'OPEN' || ep.state === 'RELAPSED') ep.state = 'REPAIRING';
    }

    /* ── failure — only the authoritative bar may move an episode ── */
    if (isMiss(e)) {
      if (e.attempt?.observed !== true) continue;
      if (!contractAttributesFunctions(task.evaluation?.contractId)) continue;
      const declared = task.response?.requiredFunctions ?? [];
      const missing = (e.evaluation?.missingFunctions ?? []).filter((f) => declared.includes(f));
      if (!missing.length) continue;
      if (!taught.has(e.capabilityId)) continue; // baseline miss — nothing to correct
      if (!ep) {
        const fresh = newEpisode(learnerId, e, missing);
        episodes.push(fresh);
        openByCap.set(e.capabilityId, fresh);
        continue;
      }
      /* A second failure NEVER closes or replaces the open episode — it
       * widens the same one. While waiting/due it is a relapse. */
      ep.failures.push({
        eventId: e.id, taskId: e.taskId, taskRevision: e.taskRevision,
        at: e.occurredAt, missingFunctions: [...missing].sort()
      });
      for (const f of missing) {
        if (!ep.missingFunctions.includes(f)) ep.missingFunctions.push(f);
        delete ep.verifiedFunctions[f]; // re-missed → re-prove post-lag
      }
      ep.missingFunctions.sort();
      if (ep.state === 'REPAIRED_WAITING' || ep.state === 'RETEST_DUE') {
        ep.state = 'RELAPSED';
        ep.relapseCount += 1;
        ep.lastRelapseAt = e.occurredAt;
        ep.repairedAt = null;  // the repair demonstrably did not hold
        ep.retestDueAt = null;
      }
      // OPEN/REPAIRING/RELAPSED absorb the failure in place.
      continue;
    }

    /* ── success ── */
    if (!isSuccess(e)) continue;
    taught.add(e.capabilityId);
    if (!ep) continue;

    const required = task.response?.requiredFunctions ?? [];
    const covered = remainingOf(ep).filter((f) => required.includes(f));
    if (!independent || covered.length === 0) continue; // supported/irrelevant — never repair

    const wasWaiting = ep.state === 'REPAIRED_WAITING' || ep.state === 'RETEST_DUE';
    if (!wasWaiting) {
      /* Any demonstrated recovery on a missed function is the repair —
       * not only remediation-purpose tasks (mirrors the support-demand
       * lifecycle's "demonstrated recovery retires the demand"). The
       * surface that carried the repair is exposed evidence — burn it
       * from the delayed retest pool regardless of its purpose. */
      ep.state = 'REPAIRED_WAITING';
      ep.repairedAt = e.occurredAt;
      ep.retestDueAt = e.occurredAt + lag;
      if (!ep.repairSurfaceTaskIds.includes(task.id)) ep.repairSurfaceTaskIds.push(task.id);
      continue;
    }

    /* Waiting/due — a covering independent success is either premature
     * practice (pre-lag — the exposure burns the surface for the later
     * retest), a burned surface (any failure or repair task in this
     * episode), or the retest itself. */
    const eligibleSurface = RETEST_PURPOSES.includes(task.purpose) && !usedSurfaces(ep).has(task.id);
    if (!eligibleSurface) continue;
    if (e.occurredAt < ep.retestDueAt) {
      ep.earlyRetestAttempts += 1;
      if (!ep.practicedRetestTaskIds.includes(task.id)) ep.practicedRetestTaskIds.push(task.id);
      continue;
    }
    for (const f of covered) ep.verifiedFunctions[f] = { at: e.occurredAt, eventId: e.id };
    if (remainingOf(ep).length === 0) {
      ep.state = 'VERIFIED';
      ep.verifiedAt = e.occurredAt;
      ep.verifiedByEventId = e.id;
      openByCap.delete(e.capabilityId);
    }
  }

  /* Fold `now` into the exposed state: RETEST_DUE is REPAIRED_WAITING
   * past its due time — a wall-clock property, not an event fact. */
  const generatedAt = Number.isFinite(now) ? now : null;
  for (const ep of episodes) {
    if (ep.state === 'REPAIRED_WAITING' && generatedAt != null && generatedAt >= ep.retestDueAt) {
      ep.state = 'RETEST_DUE';
    }
  }

  const unresolvedIndex = {};
  for (const ep of episodes) {
    if (UNRESOLVED.has(ep.state)) unresolvedIndex[ep.capabilityId] = ep;
  }

  return {
    contractVersion: CORRECTION_EPISODES_VERSION,
    learnerId,
    generatedAt,
    generatedFrom: mine.length,
    policyVersion: pol.version,
    episodes,
    /* capabilityId → episode for every UNRESOLVED episode — the B1
     * gate reads exactly this. */
    openByCapability: unresolvedIndex
  };
}

/* A compact, serializable per-decision view for the B1 record and the
 * divergence classifier — ids, states and remaining gaps only. */
export function episodeDigest(derived) {
  return (derived?.episodes ?? []).map((ep) => ({
    episodeId: ep.episodeId,
    learnerId: ep.learnerId,
    capabilityId: ep.capabilityId,
    state: ep.state,
    burnedTaskIds: [...usedSurfaces(ep)],
    missingFunctions: ep.missingFunctions,
    remainingFunctions: remainingOf(ep),
    sourceTaskId: ep.sourceTaskId,
    sourceEventId: ep.sourceEventId,
    repairedAt: ep.repairedAt,
    retestDueAt: ep.retestDueAt,
    relapseCount: ep.relapseCount,
    verifiedAt: ep.verifiedAt
  }));
}
