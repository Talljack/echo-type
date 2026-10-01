/*
 * vNext learning policy (issue #52, research R3 on #49).
 *
 *   Engine defines WHAT HAPPENED. Policy defines HOW MUCH IS ENOUGH.
 *
 * Every pedagogical threshold is data, not code. A threshold change is
 * a new policy version — derived state and claims carry `policyVersion`
 * so yesterday's claim can never be silently reinterpreted under
 * today's numbers. What stays in the engine: append-only evidence,
 * provenance gates, aid contamination, revision trust, deterministic
 * replay — semantics, not tunables.
 *
 *   retention.minLagMs                    delayed-check horizon
 *   independent.successfulUnaidedRetrievals   claim-level count (the
 *     milestone INDEPENDENT still means "did it once, unaided" — this
 *     threshold is for the stricter stability claim)
 *   independent.minDistinctSessions       spacing requirement
 *   independent.minSpacingGapMs           what counts as a new session
 *   remediation.minConsecutiveFailures    consecutive fail/partial on a
 *     taught capability before the planner routes to remediation
 *   claim.require*                        which probe types a full
 *     evidence package must contain
 *   claim.blockOnUnresolvedContradiction  latest outcome of a probe
 *     type failing blocks the claim until repaired
 */

const HOUR = 60 * 60 * 1000;

export const LEARNING_POLICY_V1 = deepFreeze({
  version: 'vnext.policy.v1',
  retention: { minLagMs: 24 * HOUR },
  independent: {
    successfulUnaidedRetrievals: 2,
    minDistinctSessions: 2,
    minSpacingGapMs: 30 * 60 * 1000
  },
  remediation: { minConsecutiveFailures: 1 },
  /* Support demands (issue #61): how many times the SAME (target
   * capability, missing function) pair may mint a support cycle before
   * the planner stops re-offering substrate work and the target falls
   * back to normal remediation. 1 = one probe cycle per gap — if the
   * substrate probe did not fix the miss, repeating it identically is
   * not remediation, it is a loop. */
  supportDemand: { maxCyclesPerPair: 1 },
  claim: {
    requireDelayedSuccess: true,
    requireTransferSuccess: true,
    requireAssessmentSuccess: true,
    blockOnUnresolvedContradiction: true
  }
});

const REGISTRY = new Map([[LEARNING_POLICY_V1.version, LEARNING_POLICY_V1]]);

const isPosInt = (v) => Number.isInteger(v) && v >= 1;
const isPosNum = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isBool = (v) => v === true || v === false;

export function validatePolicy(p) {
  const problems = [];
  if (!p || typeof p !== 'object') return ['policy is not an object'];
  if (typeof p.version !== 'string' || !p.version) problems.push('policy.version must be a non-empty string');
  if (!isPosNum(p.retention?.minLagMs)) problems.push('retention.minLagMs must be a positive number');
  if (!isPosInt(p.independent?.successfulUnaidedRetrievals)) problems.push('independent.successfulUnaidedRetrievals must be an integer ≥ 1');
  if (!isPosInt(p.independent?.minDistinctSessions)) problems.push('independent.minDistinctSessions must be an integer ≥ 1');
  if (!isPosNum(p.independent?.minSpacingGapMs) && p.independent?.minSpacingGapMs !== 0) {
    problems.push('independent.minSpacingGapMs must be a number ≥ 0');
  }
  if (!isPosInt(p.remediation?.minConsecutiveFailures)) problems.push('remediation.minConsecutiveFailures must be an integer ≥ 1');
  // Optional demand bound — absent means the v0 default (1 cycle/pair).
  if (p.supportDemand != null && !isPosInt(p.supportDemand?.maxCyclesPerPair)) {
    problems.push('supportDemand.maxCyclesPerPair must be an integer ≥ 1 when present');
  }
  for (const k of ['requireDelayedSuccess', 'requireTransferSuccess', 'requireAssessmentSuccess', 'blockOnUnresolvedContradiction']) {
    if (!isBool(p.claim?.[k])) problems.push(`claim.${k} must be a boolean`);
  }
  return problems;
}

/* A policy may be supplied as a registered version string or as an
 * object. Unknown strings and malformed objects both fail closed —
 * an unverifiable threshold is worse than a thrown error. */
export function resolvePolicy(policy) {
  if (policy == null) return LEARNING_POLICY_V1;
  if (typeof policy === 'string') {
    const p = REGISTRY.get(policy);
    if (!p) throw new Error(`unknown policy version '${policy}'`);
    return p;
  }
  const problems = validatePolicy(policy);
  if (problems.length) throw new Error(`invalid learning policy '${policy?.version}': ${problems.join('; ')}`);
  return policy;
}

/* Test/debug variants: same shape, caller-supplied version so derived
 * state still identifies which thresholds produced it. */
export function makePolicy(version, overrides = {}) {
  const p = {
    version,
    retention: { ...LEARNING_POLICY_V1.retention, ...overrides.retention },
    independent: { ...LEARNING_POLICY_V1.independent, ...overrides.independent },
    remediation: { ...LEARNING_POLICY_V1.remediation, ...overrides.remediation },
    supportDemand: { ...LEARNING_POLICY_V1.supportDemand, ...overrides.supportDemand },
    claim: { ...LEARNING_POLICY_V1.claim, ...overrides.claim }
  };
  const problems = validatePolicy(p);
  if (problems.length) throw new Error(`invalid policy '${version}': ${problems.join('; ')}`);
  return deepFreeze(p);
}

function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') deepFreeze(v);
  }
  return Object.freeze(o);
}
