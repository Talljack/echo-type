/*
 * Next For You — shared constants (Mission 008B spec hardened in
 * experiments/, promoted to production source in 008C; spec
 * docs/specs/next-for-you-v0.md). This module is now part of the
 * production vNext runtime — it must never import Node builtins or
 * anything under experiments/.
 *
 * Provenance tags per spec §33: every contribution records whether it is
 * an [EVIDENCE] finding, a [KERNEL] invariant, a [SAFETY_PRIOR] bound, or
 * an [EXPERIMENTAL] hypothesis.
 */

export const PROVENANCE = deepFreeze({
  EVIDENCE: 'EVIDENCE',
  KERNEL: 'KERNEL_INVARIANT',
  SAFETY: 'SAFETY_PRIOR',
  EXPERIMENTAL: 'EXPERIMENTAL'
});

export const POLICY_VERSIONS = deepFreeze({
  A: 'vnext.selection-policy.a0.v1',
  B: 'vnext.selection-policy.b0.v1',
  C: 'vnext.selection-policy.c0.v1',
  /* 008F: B0 + correction-episode gating — a delayed independent retest
   * must verify a repair before transfer/assessment may certify. */
  B1: 'vnext.selection-policy.b1.v1'
});

/* Intent kinds — mirrors spec §2. `fluency` intentionally absent. */
export const KINDS = deepFreeze({
  RESUME: 'resume_in_flight',
  SUPPORT_DEMAND: 'support_demand',
  CORRECTION: 'correction',
  REFRESH: 'refresh',
  DUE_RETRIEVAL: 'due_retrieval',
  ASSESSMENT: 'assessment',
  DIAGNOSTIC_PROBE: 'diagnostic_probe',
  TRANSFER: 'transfer',
  INDEPENDENT_ATTEMPT: 'independent_attempt',
  MISSION_CONTINUATION: 'mission_continuation',
  NEW_INPUT: 'new_input',
  /* 008F/B1 only: a delayed independent retest of a corrected
   * capability — minted while a correction episode is RETEST_DUE.
   * B0 never emits it (B0 has no episode derivation). */
  CORRECTION_RETEST: 'correction_retest',
  BLOCKED: 'blocked',
  IDLE: 'idle'
});

/* Tier order per spec §3 — the REPAIR-over-MAINTENANCE ordering is an
 * EXPERIMENTAL divergence from the production cascade (which runs
 * due-retrieval before repair) and is measured by the benchmark, not
 * asserted. */
export const TIERS = deepFreeze({
  MANDATORY: 0,
  REPAIR: 1,
  MAINTENANCE: 2,
  EVIDENCE: 3,
  PROGRESS: 4,
  INTRODUCE: 5,
  TERMINAL: 6
});

export const TIER_OF = deepFreeze({
  resume_in_flight: TIERS.MANDATORY,
  support_demand: TIERS.REPAIR,
  correction: TIERS.REPAIR,
  refresh: TIERS.REPAIR,
  due_retrieval: TIERS.MAINTENANCE,
  /* A due correction retest is repair-lifecycle work: it must outrank
   * maintenance/evidence so the episode can actually close. */
  correction_retest: TIERS.REPAIR,
  assessment: TIERS.EVIDENCE,
  diagnostic_probe: TIERS.EVIDENCE,
  transfer: TIERS.PROGRESS,
  independent_attempt: TIERS.PROGRESS,
  mission_continuation: TIERS.PROGRESS,
  new_input: TIERS.INTRODUCE,
  blocked: TIERS.TERMINAL,
  idle: TIERS.TERMINAL
});

/* Selection-policy tunables — every value is a SAFETY_PRIOR or an
 * EXPERIMENTAL hypothesis, never a calibrated optimum (spec §7/§22/§23).
 * A change here is a new selection-policy version. */
export const SELECTION_DEFAULTS = deepFreeze({
  /* Failure ceiling: suppress the IDENTICAL retry candidate once a taught
   * capability has failed this many times in a row — the learner needs a
   * different move (demand, probe, sideways input), not the same loss.
   * SAFETY_PRIOR: not a pedagogically optimal threshold. */
  failureCeiling: 3,
  /* Diagnostic budget per decision episode (session), NOT per streak —
   * a streak is an engagement construct, not a learning boundary.
   * SAFETY_PRIOR. */
  diagnosticMaxPerEpisode: 2,
  /* Hysteresis: the capability currently being worked gets a bounded
   * continuation preference so one-step state changes don't thrash the
   * learner across capabilities. SAFETY_PRIOR/UX prior. */
  threadContinuation: true,
  /* Starvation guard variant. EXPERIMENTAL policy hypothesis — the
   * research does not establish an optimal review:new ratio; the
   * benchmark compares REVIEW/BALANCED/FORWARD variants and only
   * pathological variants are eliminated. */
  starvationGuard: 'balanced' // 'review' | 'balanced' | 'forward'
});

function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') deepFreeze(v);
  }
  return Object.freeze(o);
}
