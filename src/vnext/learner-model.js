/*
 * vNext learner model (Mission 007) — the derived read-model over the
 * evidence kernel.
 *
 * It answers ONE question: "what can this learner currently demonstrate,
 * supported by which evidence, with what uncertainty". It never answers
 * "what should they do next" — that is the planner's job, and the
 * planner does not consume this model.
 *
 * Contract:
 *   - PURE: a deterministic function of (learnerId, events, capability
 *     registry, task registry, policy, now, roles). Same inputs → same
 *     model, regardless of event arrival order (canonical sort),
 *     duplicate deliveries (id dedupe) or resyncs.
 *   - LEARNER-ISOLATED: events for another learnerId are ignored, so a
 *     shared log can never cross-contaminate.
 *   - REBUILDABLE: nothing here is stored; the model is always derived
 *     from the append-only evidence stream.
 *   - SERIALIZABLE: plain JSON-shaped objects only (no Maps/Sets).
 *   - SEPARATE DIMENSIONS: contact, support dependency, independent
 *     performance, retention, transfer, assessment, failure/gap,
 *     recency and uncertainty are distinct fields — never collapsed
 *     into one score. There is intentionally NO mastery/proficiency/
 *     CEFR number anywhere in this module.
 *   - EVIDENCE BAR: a fact only enters the model through the same
 *     verification seam the projection uses — registered task at
 *     stamped revision, verifyEventTask, modality match, observed
 *     outcomes, authority rules. Unverified/stale-revision events are
 *     counted as unverifiable context, never as ability.
 *   - NO SECOND TRUTH: milestone semantics come from
 *     projectLearnerState; demand lifecycle comes from
 *     deriveSupportLifecycle — the SAME derivation the planner uses.
 *     This module only counts and classifies what those see.
 *
 * Memory boundary (doctrine): capability evidence is NOT memory
 * strength. RETAINED is a demonstrated-ability fact, not an FSRS state;
 * FSRS due-ness is a scheduling fact, not a weakness claim. There is
 * no vNext memory model yet, so `memory` reports 'NOT_MODELED' rather
 * than pretending a schedule doubles as ability.
 */

import { projectLearnerState } from './projection.js';
import { answerBearing, conditionsViolated, unionSupport } from './evidence.js';
import { effectiveAllowedSupport, verifyEventTask } from './contracts.js';
import { contractAttributesFunctions } from './evaluators.js';
import { resolvePolicy } from './policy.js';
import { deriveSupportLifecycle } from './planner.js';

export const LEARNER_MODEL_VERSION = 'vnext.learner-model.v1';

/* Attempt event types that carry performance outcomes — mirrors the
 * projection's gate. support_attempt is deliberately absent: a probe is
 * remediation context, never ability evidence on either capability. */
const ATTEMPT_TYPES = new Set([
  'recognition_attempt',
  'recall_attempt',
  'production_attempt',
  'interaction_turn',
  'retry',
  'delayed_retrieval',
  'transfer_attempt',
  'checkpoint'
]);

const INDEPENDENT_AUTHORITIES = new Set(['deterministic', 'human']);
const isSuccess = (e) => e.attempt?.outcome === 'success';
const isMiss = (e) => e.attempt?.outcome === 'fail' || e.attempt?.outcome === 'partial';

function emptyCapView() {
  return {
    achievement: {
      state: 'NOT_SEEN',
      milestones: {
        exposed: false, supported: false, independent: false,
        retained: false, transferred: false, fluent: false
      }
    },
    evidence: {
      origin: 'unknown', // 'baseline' | 'in_program' | 'unknown'
      firstSeenAt: null,
      lastSeenAt: null,
      lastIndependentAt: null,
      latestOutcome: null,
      attemptCount: 0,
      verifiedAttemptCount: 0,
      unverifiableEventCount: 0,
      independentSuccessCount: 0,
      delayedSuccessCount: 0,
      transferAttemptCount: 0,
      transferSuccessCount: 0,
      assessmentCount: 0
    },
    support: {
      everUsed: false,
      lastSupportAt: null,
      demandsIssued: 0,
      pendingFunctions: [],
      servedEpisodes: 0,
      cancelledEpisodes: 0,
      lastDemandAt: null,
      dependent: false
    },
    failures: {
      /* Lifetime verified miss count — honestly named: there is no
       * recency window on this counter, callers read `consecutiveFailures`
       * or `lastFailureAt` for recency. */
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureAt: null,
      unresolvedFunctions: [],
      resolvedFunctions: [],
      recurringFunctions: []
    },
    retention: {
      demonstrated: false,
      lastDelayedEvidenceAt: null,
      sinceLastIndependentMs: null
    },
    transfer: {
      demonstrated: false,
      promptFamilies: [],
      lastTransferAt: null
    },
    assessment: {
      attempted: 0,
      /* `latestStatus`/`lastAssessmentAt` carry only OBSERVED verified
       * outcomes; `demonstrated` requires the full independent bar
       * (observed + unaided + authority) — an unobserved checkpoint
       * "success" is context, never certification. */
      latestStatus: null,
      lastAssessmentAt: null,
      demonstrated: false
    },
    uncertainty: {
      evidenceSufficient: false,
      reasons: []
    },
    /* Doctrine boundary: memory strength (FSRS/SRS scheduling) is not
     * modeled here and must never be read back into these claims. */
    memory: 'NOT_MODELED'
  };
}

function reason(code, extra) {
  return { code, ...(extra ?? {}) };
}

export function buildLearnerModel({ learnerId, events, capabilities, tasks, policy, now, roles }) {
  if (typeof learnerId !== 'string' || !learnerId) {
    throw new Error('buildLearnerModel requires a learnerId');
  }
  const pol = resolvePolicy(policy);
  if (!Array.isArray(tasks)) throw new Error('buildLearnerModel requires the registered task list');
  const generatedAt = Number.isFinite(now) ? now : null;

  const projection = projectLearnerState(learnerId, events, capabilities, tasks, { policy: pol });

  const taskByRev = new Map();
  for (const t of tasks) taskByRev.set(`${t?.id}@${t?.revision}`, t);
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const view = new Map(capabilities.map((c) => [c.id, emptyCapView()]));

  // Demand lifecycle — the planner's own derivation, so the model can
  // never disagree with the router about what is still outstanding.
  // Roles are optional: without mission context there is no routed
  // demand history, and function gaps still surface evidence-level.
  const lifecycle = roles?.supports?.size
    ? deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy: pol })
    : { pending: [], resolved: [] };
  for (const d of lifecycle.pending) {
    const v = view.get(d.targetCapabilityId);
    if (!v) continue;
    v.support.pendingFunctions.push(d.missingFunction);
    // An outstanding demand is itself a reliance signal.
    if (v.support.lastDemandAt == null || d.issuedAt > v.support.lastDemandAt) {
      v.support.lastDemandAt = d.issuedAt;
    }
  }
  for (const d of lifecycle.resolved) {
    const v = view.get(d.targetCapabilityId);
    if (!v) continue;
    if (d.status === 'consumed') {
      v.support.servedEpisodes += 1;
      if (v.support.lastSupportAt == null || d.resolvedAt > v.support.lastSupportAt) {
        v.support.lastSupportAt = d.resolvedAt;
      }
    } else {
      v.support.cancelledEpisodes += 1;
    }
  }
  for (const v of view.values()) {
    v.support.demandsIssued = v.support.servedEpisodes + v.support.cancelledEpisodes + v.support.pendingFunctions.length;
  }

  // Canonical replay: learner-scoped, id-deduped, sorted by
  // (occurredAt, id). Identical event sets produce identical models.
  const seenIds = new Set();
  const mine = [];
  for (const e of events) {
    if (e.learnerId !== learnerId || seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    mine.push(e);
  }
  mine.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const supportByAttempt = new Map();
  // Per-capability function-gap ledgers: fn → { misses, lastMissAt, lastDemoAt, reopened }
  const fnLedger = new Map(capabilities.map((c) => [c.id, new Map()]));
  // Rehearsed prompt families per capability — same rule the projection
  // uses: any verified non-transfer context marks the family rehearsed,
  // so a later transfer success on it is NOT novel transfer evidence.
  const rehearsedFamilies = new Map(capabilities.map((c) => [c.id, new Set()]));

  for (const e of mine) {
    const cap = capById.get(e.capabilityId);
    const v = view.get(e.capabilityId);
    if (!cap || !v) continue;
    if (e.modality !== cap.modality) continue;

    const task = taskByRev.get(`${e.taskId}@${e.taskRevision}`);
    const verified = Boolean(task) && verifyEventTask(e, task, cap);
    if (!verified) {
      // Unverifiable evidence is counted so callers can SEE it was
      // ignored — it can never strengthen a claim.
      v.evidence.unverifiableEventCount += 1;
      continue;
    }

    if (v.evidence.firstSeenAt == null) v.evidence.firstSeenAt = e.occurredAt;
    v.evidence.lastSeenAt = e.occurredAt;

    // Origin: a diagnostic attempt as the FIRST verified event is a
    // baseline probe. Only an independent-bar success implies
    // pre-existing ability — a failed baseline probe is evidence of
    // testing, not of ability ('baseline_probed').
    if (v.evidence.origin === 'unknown' &&
        (e.eventType === 'exposure' || task.purpose === 'input' || task.purpose === 'notice')) {
      v.evidence.origin = 'in_program';
    }

    const aid = e.attempt?.attemptId;
    let effSupport = e.support;
    if (aid) {
      const key = `${e.taskId}::${aid}`;
      const prior = supportByAttempt.get(key) ?? null;
      effSupport = unionSupport(prior, e.support);
      supportByAttempt.set(key, effSupport);
    }
    if (answerBearing(effSupport) || conditionsViolated(effSupport, effectiveAllowedSupport(cap, task))) {
      v.support.everUsed = true;
      if (v.support.lastSupportAt == null || e.occurredAt > v.support.lastSupportAt) {
        v.support.lastSupportAt = e.occurredAt;
      }
    }

    // Non-transfer verified contexts rehearse the family (projection's
    // rule) — later transfer successes on it are not novel evidence.
    if (e.context?.practicedOrTransfer !== 'transfer' && e.context?.promptFamily) {
      rehearsedFamilies.get(e.capabilityId).add(e.context.promptFamily);
    }

    if (!ATTEMPT_TYPES.has(e.eventType) || e.attempt?.outcome == null) continue;
    v.evidence.attemptCount += 1;
    v.evidence.verifiedAttemptCount += 1;
    v.evidence.latestOutcome = e.attempt.outcome;
    if (e.eventType === 'transfer_attempt') v.evidence.transferAttemptCount += 1;
    if (e.eventType === 'checkpoint') {
      v.evidence.assessmentCount += 1;
      v.assessment.attempted += 1;
    }

    const independent = isSuccess(e) &&
      e.attempt?.observed === true &&
      !answerBearing(effSupport) &&
      !conditionsViolated(effSupport, effectiveAllowedSupport(cap, task)) &&
      INDEPENDENT_AUTHORITIES.has(e.evaluation?.authority);

    // Assessment status is evidence-barred: only OBSERVED verified
    // outcomes set latestStatus, and only an independent-bar success
    // demonstrates the claim. An unobserved/aided checkpoint counts as
    // an attempt, never as certification.
    if (e.eventType === 'checkpoint' && e.attempt?.observed === true) {
      v.assessment.latestStatus = e.attempt.outcome;
      v.assessment.lastAssessmentAt = e.occurredAt;
      v.assessment.demonstrated = independent;
    }

    if (isMiss(e)) {
      v.failures.failureCount += 1;
      v.failures.lastFailureAt = e.occurredAt;
      /* Evaluator-attributed missing functions → gap ledger — but ONLY
       * when the task's contract may attribute a miss at all (same
       * boundary as SUPPORT_DEMAND). The binder bounds the list to
       * requiredFunctions; it does not prove attribution, so a stamped
       * missingFunctions on eval.required_functions.v1 is context, not
       * a diagnosed gap. */
      if (e.attempt?.observed === true && contractAttributesFunctions(task.evaluation?.contractId)) {
        const ledger = fnLedger.get(e.capabilityId);
        for (const fn of e.evaluation?.missingFunctions ?? []) {
          const rec = ledger.get(fn) ?? { misses: 0, lastMissAt: null, lastDemoAt: null, reopened: false };
          rec.misses += 1;
          if (rec.lastDemoAt != null) rec.reopened = true;
          rec.lastMissAt = e.occurredAt;
          ledger.set(fn, rec);
        }
      }
    }

    // Diagnostic-first origin (see above): settled at the first attempt.
    if (v.evidence.origin === 'unknown' && task.purpose === 'diagnostic') {
      v.evidence.origin = independent ? 'baseline_demonstrated' : 'baseline_probed';
    }

    if (!independent) continue;

    v.evidence.independentSuccessCount += 1;
    v.evidence.lastIndependentAt = e.occurredAt;
    if (e.eventType === 'delayed_retrieval') {
      v.evidence.delayedSuccessCount += 1;
      v.retention.lastDelayedEvidenceAt = e.occurredAt;
    }
    if (e.eventType === 'transfer_attempt') {
      /* Only a NOVEL-family transfer success counts as transfer
       * evidence — the same novelty rule the projection applies to the
       * TRANSFERRED milestone. */
      const family = e.context?.promptFamily;
      if (family && !rehearsedFamilies.get(e.capabilityId).has(family)) {
        v.evidence.transferSuccessCount += 1;
        v.transfer.lastTransferAt = e.occurredAt;
      }
    }
    // Demonstrated recovery on a function closes its gap entry.
    const ledger = fnLedger.get(e.capabilityId);
    for (const fn of task.response?.requiredFunctions ?? []) {
      const rec = ledger.get(fn) ?? { misses: 0, lastMissAt: null, lastDemoAt: null, reopened: false };
      rec.lastDemoAt = e.occurredAt;
      ledger.set(fn, rec);
    }
  }

  const profile = {
    unknown: [],
    insufficientEvidence: [],
    demonstrated: [],
    fragile: [],
    retained: [],
    transferProven: [],
    assessed: [],
    supportDependent: [],
    unresolvedGaps: [],
    assessmentPending: []
  };

  for (const c of capabilities) {
    const v = view.get(c.id);
    const p = projection.byCapability.get(c.id);
    v.achievement.state = p.state;
    v.achievement.milestones = p.milestones;
    v.failures.consecutiveFailures = p.consecutiveFailures;
    v.retention.demonstrated = p.milestones.retained;
    v.transfer.demonstrated = p.milestones.transferred;
    v.transfer.promptFamilies = [...p.transferPromptFamilies];
    if (generatedAt != null && v.evidence.lastIndependentAt != null) {
      v.retention.sinceLastIndependentMs = generatedAt - v.evidence.lastIndependentAt;
    }

    const ledger = fnLedger.get(c.id);
    const unresolved = [];
    const resolvedFns = [];
    const recurring = [];
    for (const [fn, rec] of ledger) {
      const demonstratedAfter = rec.lastDemoAt != null && (rec.lastMissAt == null || rec.lastDemoAt > rec.lastMissAt);
      if (rec.misses > 0 && !demonstratedAfter) {
        unresolved.push(fn);
        if (rec.reopened || rec.misses >= 2) recurring.push(fn);
      } else if (rec.misses > 0 && demonstratedAfter) {
        resolvedFns.push(fn);
        if (rec.reopened) recurring.push(fn); // resolved but the pattern saw it fail again before
      }
    }
    v.failures.unresolvedFunctions = unresolved.sort();
    v.failures.resolvedFunctions = resolvedFns.sort();
    v.failures.recurringFunctions = recurring.sort();

    /* Support dependency: support was used or demanded AND the learner
     * has no clean unaided success later than the last reliance. A
     * pending demand's issuedAt counts as reliance — an open substrate
     * gap is evidence the capability currently needs support. */
    const lastRelianceAt = Math.max(
      v.support.lastSupportAt ?? 0,
      v.support.lastDemandAt ?? 0
    ) || null;
    const relied = v.support.everUsed || v.support.servedEpisodes > 0 || v.support.pendingFunctions.length > 0;
    v.support.dependent = relied &&
      (v.evidence.lastIndependentAt == null || (lastRelianceAt ?? 0) > v.evidence.lastIndependentAt);

    /* Recency is exposed as FACT (sinceLastIndependentMs), never as an
     * inference: `retention.minLagMs` is the minimum spacing needed to
     * PROVE retention — it is not an evidence-expiry horizon, and this
     * model does not invent one. Whether old evidence still suffices is
     * a policy question for the caller. */
    const reasons = [];
    if (v.achievement.state === 'NOT_SEEN') reasons.push(reason('no_evidence'));
    else if (v.evidence.attemptCount === 0) reasons.push(reason('no_attempts'));
    else {
      if (!v.achievement.milestones.independent) {
        reasons.push(reason(v.support.everUsed ? 'only_supported_attempts' : 'no_independent_evidence'));
      } else {
        if (v.evidence.independentSuccessCount < pol.independent.successfulUnaidedRetrievals) {
          reasons.push(reason('thin_independent_evidence', { count: v.evidence.independentSuccessCount }));
        }
        if (!v.retention.demonstrated) reasons.push(reason('no_delayed_evidence'));
      }
      if (v.achievement.milestones.independent && !v.transfer.demonstrated) {
        reasons.push(reason('no_transfer_evidence'));
      }
      if (v.transfer.demonstrated) {
        if (v.assessment.latestStatus == null) reasons.push(reason('no_assessment_evidence'));
        else if (!v.assessment.demonstrated) reasons.push(reason('assessment_not_demonstrated'));
      }
      if (v.failures.consecutiveFailures > 0) reasons.push(reason('currently_failing', { consecutive: v.failures.consecutiveFailures }));
      if (v.failures.unresolvedFunctions.length) reasons.push(reason('unresolved_function_gap', { functions: [...v.failures.unresolvedFunctions] }));
      if (v.support.dependent) reasons.push(reason('support_dependent'));
    }
    v.uncertainty.reasons = reasons;
    v.uncertainty.evidenceSufficient = reasons.length === 0;

    // Categorical profile buckets — a capability can hold several
    // honest labels; there is deliberately no rollup score.
    if (v.achievement.state === 'NOT_SEEN') {
      profile.unknown.push(c.id);
    } else if (!v.achievement.milestones.independent) {
      profile.insufficientEvidence.push(c.id);
    } else {
      profile.demonstrated.push(c.id);
      /* Fragile = currently failing — a live contradiction between
       * earlier ability and latest evidence. Silence/age alone is not
       * fragility (see the recency note above). */
      if (v.failures.consecutiveFailures > 0) profile.fragile.push(c.id);
      if (v.retention.demonstrated) profile.retained.push(c.id);
      if (v.transfer.demonstrated) {
        profile.transferProven.push(c.id);
        if (v.assessment.demonstrated) profile.assessed.push(c.id);
        else profile.assessmentPending.push(c.id);
      }
    }
    if (v.support.dependent) profile.supportDependent.push(c.id);
    if (v.failures.unresolvedFunctions.length || v.support.pendingFunctions.length) {
      profile.unresolvedGaps.push(c.id);
    }
  }
  for (const list of Object.values(profile)) list.sort();

  return {
    contractVersion: LEARNER_MODEL_VERSION,
    learnerId,
    generatedAt,
    policyVersion: pol.version,
    generatedFrom: mine.length,
    memory: 'NOT_MODELED',
    capabilities: Object.fromEntries([...view.entries()].map(([id, v]) => [id, { capabilityId: id, ...v }])),
    profile
  };
}

/* Explainability: why does this capability carry its current labels?
 * Returns evidence-backed strings derived from the model's own fields —
 * never an opaque estimate. */
export function explainCapability(model, capabilityId) {
  const v = model?.capabilities?.[capabilityId];
  if (!v) return [`${capabilityId}: not a registered capability`];
  const out = [`${capabilityId}: state=${v.achievement.state}`];
  for (const r of v.uncertainty.reasons) {
    const fns = r.functions?.length ? ` (functions: ${r.functions.join(', ')})` : '';
    out.push(`  uncertainty: ${r.code}${fns}`);
  }
  if (v.support.dependent) {
    out.push(`  support-dependent: last reliance ${v.support.lastSupportAt}, ` +
      (v.evidence.lastIndependentAt == null ? 'no unaided success yet'
        : `last unaided success ${v.evidence.lastIndependentAt} predates it`));
  }
  if (v.support.servedEpisodes) out.push(`  support episodes served: ${v.support.servedEpisodes}, pending: ${v.support.pendingFunctions.join(', ') || 'none'}`);
  if (v.failures.unresolvedFunctions.length) out.push(`  unresolved gaps: ${v.failures.unresolvedFunctions.join(', ')}`);
  if (v.evidence.unverifiableEventCount) out.push(`  ignored unverifiable events: ${v.evidence.unverifiableEventCount}`);
  return out;
}
