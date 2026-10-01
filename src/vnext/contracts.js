/*
 * vNext Mission/Task/Transfer/Assessment contracts (issue #45,
 * docs/vnext/mission-task-assessment-contracts-v0.md).
 *
 * Distinct domain objects — a screen is not a Task, a Mission is not a
 * Capability, a completed Mission is not evidence:
 *
 *   Capability = what the learner can do
 *   Mission    = real-world scenario combining capabilities
 *   Task       = one elicitation/learning unit
 *   Attempt    = learner response to one task instance
 *   Evidence   = durable observation of what happened
 *   Assessment = fresh sampling of ability
 *
 * These validators exist so the contracts are *executable truth*, not
 * documentation — a task that violates its own purpose class, or a
 * mission whose teaching items leak into assessment, fails validation
 * before a single learner touches it.
 */
import { EVALUATION_AUTHORITIES } from './evidence.js';

export const TASK_PURPOSES = [
  'diagnostic',
  'input',
  'notice',
  'retrieval',
  'production',
  'interaction',
  'remediation',
  'delayed_retrieval',
  'transfer',
  'assessment',
  /* Demand-routed substrate repair (issue #61): a short probe on a
   * support capability that exists ONLY because a target task's
   * evaluation attributed the failure to a missing function. Support
   * tasks emit 'support_attempt' — remediation context, never
   * claim-bearing evidence. */
  'support',
  'fluency' // reserved — rejected by validateTask until a calibrated contract exists
];

// Purposes that elicit a learner response (may carry attempts).
export const ELICITING_PURPOSES = new Set([
  'diagnostic',
  'retrieval',
  'production',
  'interaction',
  'remediation',
  'delayed_retrieval',
  'transfer',
  'assessment',
  'support'
]);

// Purposes that only expose — they may create exposure events, never
// attempt evidence.
export const EXPOSURE_PURPOSES = new Set(['input', 'notice']);

/* Which attempt event types a purpose may produce. Assessment binds to
 * 'checkpoint'; transfer to 'transfer_attempt'. A purpose can never emit
 * an event type it does not own — a retrieval task cannot mint a
 * transfer_attempt. The projection re-checks this on bound events. */
export const EVENT_TYPES_FOR_PURPOSE = {
  /* input/notice are exposure-phase tasks — they can only ever mint
   * observation events, never an attempt outcome. */
  input: ['exposure', 'support_use', 'feedback'],
  notice: ['exposure', 'support_use', 'feedback'],
  diagnostic: ['recognition_attempt', 'recall_attempt', 'production_attempt', 'interaction_turn'],
  retrieval: ['recognition_attempt', 'recall_attempt', 'retry'],
  production: ['production_attempt', 'retry'],
  interaction: ['interaction_turn', 'retry'],
  remediation: ['retry', 'recognition_attempt', 'recall_attempt', 'production_attempt', 'interaction_turn'],
  delayed_retrieval: ['delayed_retrieval'],
  transfer: ['transfer_attempt'],
  assessment: ['checkpoint'],
  /* A support probe emits its own event type so no attempt semantics
   * bleed across: recognition/recall/production/retry are all
   * milestone-bearing types the projection promotes; support_attempt is
   * deliberately not one of them. */
  support: ['support_attempt']
};

/* The deterministic UI mapping from (purpose, response kind) to the
 * event type a commit emits. This is a CONTRACT, not a UI detail — it
 * decides whether a task shape is servable at all: if the emitted type
 * is not one the purpose may produce, the task wedges at bindAttempt
 * (fail-closed, but a dead mission for the learner). validateTask
 * rejects such shapes at authoring time. `responseKind` is 'choice' for
 * option responses, 'text' for everything else. */
export function emittedEventType(purpose, responseKind) {
  return purpose === 'delayed_retrieval' ? 'delayed_retrieval'
    : purpose === 'transfer' ? 'transfer_attempt'
      : purpose === 'assessment' ? 'checkpoint'
        : purpose === 'remediation' ? 'retry'
          : purpose === 'interaction' ? 'interaction_turn'
            : purpose === 'support' ? 'support_attempt'
              : responseKind === 'choice' ? 'recognition_attempt'
                : purpose === 'production' ? 'production_attempt'
                  : 'recall_attempt';
}

export const TRANSFER_DIMENSIONS = [
  'wording',
  'partner',
  'setting',
  'medium',
  'response_form',
  'support_level',
  'task_goal',
  'delay'
];

export const FAMILY_CLASSES = ['practiced', 'fresh_transfer', 'fresh_assessment'];

/* A context signature describes the communicative situation a prompt
 * family lives in — WHO talks, WHERE, in WHICH register and channel,
 * with WHAT cue shape. Two prompts that differ only in surface words
 * or named entities are the SAME family; a family changes only when a
 * signature field changes. This makes novelty auditable: a transfer
 * task must differ from every rehearsed family on a declared signature
 * field, not merely on prompt text. */
export const SIGNATURE_FIELDS = [
  'communicativeFunction',
  'cueTopology',
  'setting',
  'register',
  'channel',
  'interlocutorRole',
  'relationship',
  'responseTopology',
  'lexicalDomain'
];

/* The signature fields embedded in a canonical prompt-family id:
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.<sigHash8>.vN
 * The readable segments name the context; the trailing 8-char hash is an
 * injective fingerprint over the WHOLE signature, so two families that
 * differ only in a non-id field (interlocutorRole, relationship, …)
 * still get distinct ids — and an id that does not hash to its declared
 * signature fails the curriculum gate. */
export const SIGNATURE_ID_FIELDS = ['cueTopology', 'setting', 'register', 'channel'];

/* fnv1a-32 over the canonicalized signature — deterministic, pure-JS
 * (must run in the browser: fixtures are bundled into /vnext/). Not a
 * security hash: it only needs to be stable + injective enough to make
 * family ids self-consistent. */
export function signatureHash(sig) {
  const fields = SIGNATURE_FIELDS.filter((f) => sig?.[f] != null).sort();
  const canonical = JSON.stringify(fields.map((f) => [f, sig[f]]));
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function canonicalFamilyId(capabilityId, sig, version = 1) {
  return `pf.${capabilityId}.${sig.cueTopology}.${sig.setting}.${sig.register}.${sig.channel}.${signatureHash(sig)}.v${version}`;
}

/* Family class → evidence context kind. 'assessment' is NOT 'transfer' —
 * a fresh assessment samples ability, it does not earn transfer credit.
 * The projection re-derives this from the registry task; the stamped
 * context kind is only trusted when it matches. */
export const CONTEXT_FOR_FAMILY = {
  practiced: 'practiced',
  fresh_transfer: 'transfer',
  fresh_assessment: 'assessment'
};

// Support kinds that may appear in conditions/supportPolicy lists.
export const SUPPORT_CONDITION_KINDS = [
  'hint',
  'translation',
  'transcript',
  'modelAnswer',
  'repeat',
  'repeat_once'
];

/* The support a learner may use while still producing *independent*
 * evidence is the intersection of what the capability permits and what
 * the task permits. A task may narrow a capability's conditions; it may
 * NEVER broaden them. */
export function effectiveAllowedSupport(capability, task) {
  const capAllowed = capability?.conditions?.supportAllowed ?? [];
  const taskAllowed = task?.supportPolicy?.allowed ?? capAllowed;
  return capAllowed.filter((k) => taskAllowed.includes(k));
}

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isStrList = (v) => Array.isArray(v) && v.every(isStr);

const sameStringSet = (a, b) =>
  Array.isArray(a) && Array.isArray(b) &&
  a.length === b.length && a.every((x) => b.includes(x));

/* An event earns independent credit ONLY if it verifies against the
 * registered Task contract — the binder stamp alone is data, not proof.
 * Every semantic field is re-derived from the task in the registry:
 *
 *   taskId + revision  — the exact contract version that produced it
 *   capabilityId       — the capability the task belongs to
 *   modality           — the modality the task declares
 *   purpose↔eventType  — the event type must be one the task's purpose
 *                        may emit (a retrieval task never mints a
 *                        transfer_attempt)
 *   promptFamily       — the family comes from the task, not the caller
 *   context            — missionId and the context kind derived from
 *                        the task's family class
 *   evaluation         — authority AND contractId identical to the
 *                        task's declared evaluator contract
 *   binding            — the stamped provenance must agree with the
 *                        task: purpose, familyClass, freshnessRequired,
 *                        and the effective support policy recomputed
 *                        from capability ∩ task — never the stamped list
 *
 * Plus: an eliciting task without a real evaluator contractId can never
 * verify, even if a caller hand-built a "task" object to match.
 *
 * An event that fails verification is still recorded faithfully — it
 * can mark EXPOSED/SUPPORTED — but it can never mint INDEPENDENT. */
export function verifyEventTask(event, task, capability) {
  if (!task || !capability) return false;
  // The registry entry must itself be a valid contract — a hand-rolled
  // task (e.g. purpose 'transfer' with no changedDimensions) is never
  // trusted, however closely an event's fields happen to match it.
  if (validateTask(task).length) return false;
  const e = event;
  if (e.taskRevision !== task.revision) return false;
  if (e.capabilityId !== task.capabilityId || task.capabilityId !== capability.id) return false;
  if (e.modality !== task.modality || task.modality !== capability.modality) return false;
  if (!(EVENT_TYPES_FOR_PURPOSE[task.purpose] ?? []).includes(e.eventType)) return false;
  if (e.context?.missionId !== task.missionId) return false;
  if (e.context?.promptFamily !== task.promptFamily) return false;
  if (e.context?.practicedOrTransfer !== CONTEXT_FOR_FAMILY[task.freshness?.familyClass ?? 'practiced']) return false;
  if (e.evaluation?.authority !== (task.evaluation?.authority ?? 'deterministic')) return false;
  if (e.evaluation?.contractId !== (task.evaluation?.contractId ?? null)) return false;
  if (e.binding?.purpose !== task.purpose) return false;
  if (e.binding?.familyClass !== (task.freshness?.familyClass ?? 'practiced')) return false;
  if (e.binding?.freshnessRequired !== (task.freshness?.required === true)) return false;
  if (!sameStringSet(e.binding?.effectiveSupportAllowed, effectiveAllowedSupport(capability, task))) return false;
  if (ELICITING_PURPOSES.has(task.purpose) && !isStr(task.evaluation?.contractId)) return false;
  return true;
}

/* ── TaskContract ─────────────────────────────────────────── */

export function makeTask(fields) {
  const task = {
    revision: 1,
    stimulus: { type: null, languageComponents: [] },
    response: { type: null, requiredFunctions: [] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    evaluation: { authority: 'deterministic', contractId: null },
    freshness: { required: false, familyClass: 'practiced' },
    transfer: null,
    assessment: null,
    contextSignature: null,
    language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [] },
    ...fields,
    supportPolicy: { allowed: [], revealModelAfterAttempt: false, ...(fields?.supportPolicy || {}) },
    evaluation: { authority: 'deterministic', contractId: null, ...(fields?.evaluation || {}) },
    freshness: { required: false, familyClass: 'practiced', ...(fields?.freshness || {}) },
    language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [], ...(fields?.language || {}) }
  };
  const problems = validateTask(task);
  if (problems.length) throw new Error(`invalid TaskContract ${task.id || '?'}: ${problems.join('; ')}`);
  return task;
}

export function validateTask(task) {
  const p = [];
  for (const k of ['id', 'missionId', 'capabilityId', 'modality', 'promptFamily']) {
    if (!isStr(task?.[k])) p.push(`missing ${k}`);
  }
  if (!Number.isInteger(task?.revision) || task.revision < 1) p.push('revision must be a positive integer');
  if (!TASK_PURPOSES.includes(task?.purpose)) p.push(`unknown purpose ${task?.purpose}`);

  /* A contextSignature, when present, is the family's auditable identity
   * — partial or misshaped signatures are meaningless and rejected. */
  const sig = task?.contextSignature;
  if (sig != null) {
    if (typeof sig !== 'object' || Array.isArray(sig)) {
      p.push('contextSignature must be an object');
    } else {
      for (const k of Object.keys(sig)) {
        if (!SIGNATURE_FIELDS.includes(k)) p.push(`contextSignature: unknown field '${k}'`);
        else if (!isStr(sig[k])) p.push(`contextSignature.${k} must be a non-empty string`);
      }
      for (const k of SIGNATURE_ID_FIELDS) {
        if (!isStr(sig[k])) p.push(`contextSignature.${k} is required`);
      }
    }
  }

  const fc = task?.freshness?.familyClass;
  if (fc != null && !FAMILY_CLASSES.includes(fc)) p.push(`unknown freshness familyClass ${fc}`);
  if (task?.freshness?.required && fc === 'practiced') {
    p.push('freshness.required conflicts with familyClass practiced');
  }

  for (const k of task?.supportPolicy?.allowed ?? []) {
    if (!SUPPORT_CONDITION_KINDS.includes(k)) p.push(`unknown support condition '${k}'`);
  }

  /* Evaluator provenance is mandatory for anything that can elicit a
   * response: a declared authority AND a real evaluator contract id.
   * `authority: deterministic, contractId: null` is not an evaluator —
   * it is an unnamed opinion, and it must never mint evidence. */
  if (!EVALUATION_AUTHORITIES.includes(task?.evaluation?.authority)) {
    p.push(`unknown evaluation authority '${task?.evaluation?.authority}'`);
  }
  if (ELICITING_PURPOSES.has(task?.purpose) && !isStr(task?.evaluation?.contractId)) {
    p.push(`purpose '${task?.purpose}' requires evaluation.contractId — evidence needs a named evaluator contract`);
  }

  /* Response shape × purpose compatibility: the UI commit path emits a
   * deterministic event type for (purpose, response kind). If that type
   * is one the purpose may never produce, the task is a wedge — it can
   * never carry an attempt and would throw at every learner commit. */
  if (ELICITING_PURPOSES.has(task?.purpose) && task?.response?.type != null) {
    const kind = task.response.type === 'choice' ? 'choice' : 'text';
    const emitted = emittedEventType(task.purpose, kind);
    if (!(EVENT_TYPES_FOR_PURPOSE[task.purpose] ?? []).includes(emitted)) {
      p.push(`purpose '${task.purpose}' + response.type '${task.response.type}' emits '${emitted}', which this purpose may never produce — an unservable task shape`);
    }
  }

  if (task?.purpose === 'fluency') {
    p.push('purpose fluency is reserved — no calibrated fluency contract exists in v0');
  }

  /* Support probes are remediation substrate, not held-out evidence:
   * they must live in a practiced family (novelty is meaningless for
   * them) and they must actually elicit a response — a non-eliciting
   * support task can never carry a support_attempt. */
  if (task?.purpose === 'support') {
    if (task?.freshness?.required || (fc != null && fc !== 'practiced')) {
      p.push('support tasks require freshness { required: false, familyClass: practiced } — a probe is never transfer or assessment evidence');
    }
    if (!task?.response?.type || task.response.type === 'none') {
      p.push('support tasks must elicit a response — a probe with response.type none can never run');
    }
  }

  if (task?.purpose === 'transfer') {
    const dims = task?.transfer?.changedDimensions ?? [];
    if (!Array.isArray(dims) || dims.length === 0) {
      p.push('transfer task must declare at least one changed dimension');
    } else {
      for (const d of dims) {
        if (!TRANSFER_DIMENSIONS.includes(d)) p.push(`unknown transfer dimension '${d}'`);
      }
    }
    if (task?.freshness?.familyClass !== 'fresh_transfer' || !task?.freshness?.required) {
      p.push('transfer task requires freshness { required: true, familyClass: fresh_transfer }');
    }
  }

  if (task?.purpose === 'assessment') {
    if (task?.freshness?.familyClass !== 'fresh_assessment' || !task?.freshness?.required) {
      p.push('assessment requires freshness { required: true, familyClass: fresh_assessment }');
    }
    if ((task?.supportPolicy?.allowed ?? []).length > 0) {
      p.push('assessment tasks may not allow support');
    }
    if (task?.assessment?.answerRevealDuringAttempt !== false) {
      p.push('assessment.answerRevealDuringAttempt must be false');
    }
    const sample = task?.assessment?.capabilitySample;
    if (!isStrList(sample) || sample.length === 0) {
      p.push('assessment.capabilitySample must be a non-empty capability list');
    } else if (isStr(task?.capabilityId) && !sample.includes(task.capabilityId)) {
      p.push('assessment.capabilitySample must include the task capabilityId');
    }
  }
  return p;
}

/* ── MissionContract ──────────────────────────────────────── */

export function makeMission(fields) {
  return {
    revision: 1,
    targetCapabilities: [],
    prerequisiteCapabilities: [],
    /* Carriers are capabilities the mission rehearses for retention and
     * contextual diversity WITHOUT claiming them as acquisition targets:
     * they may carry baseline/input/retrieval/delayed evidence, but the
     * mission does not owe them transfer or assessment coverage (a cap
     * may be a carrier here and a target in a later mission). */
    carrierCapabilities: [],
    supportCapabilities: [],
    language: {
      assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
      introduced: { chunks: [], vocabulary: [], constructions: [] }
    },
    taskIds: [],
    transferPlan: { required: false, dimensions: [] },
    assessmentPlan: { required: false, freshnessRequired: true },
    ...fields,
    language: {
      assumedKnown: {
        chunks: fields?.language?.assumedKnown?.chunks ?? [],
        vocabulary: fields?.language?.assumedKnown?.vocabulary ?? [],
        constructions: fields?.language?.assumedKnown?.constructions ?? []
      },
      introduced: {
        chunks: fields?.language?.introduced?.chunks ?? [],
        vocabulary: fields?.language?.introduced?.vocabulary ?? [],
        constructions: fields?.language?.introduced?.constructions ?? []
      }
    }
  };
}

export function validateMission(mission, tasks, capabilities) {
  const p = [];
  if (!isStr(mission?.id)) p.push('mission missing id');
  if (!Number.isInteger(mission?.revision) || mission.revision < 1) p.push('mission revision must be a positive integer');
  if (!isStr(mission?.scenario) || !isStr(mission?.learnerGoal)) p.push('mission needs scenario + learnerGoal');

  const capIds = new Set(capabilities.map((c) => c.id));
  const declared = new Set([
    ...(mission?.targetCapabilities ?? []),
    ...(mission?.carrierCapabilities ?? []),
    ...(mission?.prerequisiteCapabilities ?? []),
    ...(mission?.supportCapabilities ?? [])
  ]);
  for (const list of ['targetCapabilities', 'carrierCapabilities', 'prerequisiteCapabilities', 'supportCapabilities']) {
    for (const id of mission?.[list] ?? []) {
      if (!capIds.has(id)) p.push(`${list}: unknown capability '${id}'`);
    }
  }

  // Prerequisite closure: every declared capability must have ITS
  // transitive prerequisites somewhere on the mission surface — an
  // undeclared prerequisite can never reach INDEPENDENT (it has no
  // tasks and is not even projected), so its dependents deadlock.
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const closure = (id, seen = new Set()) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const pre of byId.get(id)?.prerequisites ?? []) {
      if (!declared.has(pre)) p.push(`capability '${id}' has undeclared prerequisite '${pre}'`);
      closure(pre, seen);
    }
  };
  for (const id of declared) closure(id);

  // Tasks: every declared id resolves, every given task belongs to this
  // mission, and its declared capability is in the mission surface.
  // A task that claims this missionId but is absent from taskIds is an
  // integrity violation — it never counts toward any invariant below.
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const idSet = new Set(mission?.taskIds ?? []);
  if (idSet.size !== (mission?.taskIds ?? []).length) p.push('duplicate taskIds');
  for (const t of tasks) {
    if (t.missionId === mission.id && !idSet.has(t.id)) {
      p.push(`task '${t.id}' claims mission '${mission.id}' but is not declared in taskIds`);
    }
  }
  const missionTasks = [];
  for (const tid of mission?.taskIds ?? []) {
    const t = taskById.get(tid);
    if (!t) { p.push(`taskIds references missing task '${tid}'`); continue; }
    if (t.missionId !== mission.id) p.push(`task '${tid}' belongs to mission '${t.missionId}'`);
    if (t.capabilityId && !declared.has(t.capabilityId)) {
      p.push(`task '${tid}' targets undeclared capability '${t.capabilityId}'`);
    }
    missionTasks.push(t);
  }

  // Every target capability needs at least one eliciting/evidence path —
  // exposure alone never proves ability.
  for (const capId of mission?.targetCapabilities ?? []) {
    const hasPath = missionTasks.some(
      (t) => t.capabilityId === capId && ELICITING_PURPOSES.has(t.purpose)
    );
    if (!hasPath) p.push(`target '${capId}' has no eliciting task — exposure is not evidence`);
  }

  // Freshness collision: when the mission requires fresh assessment, no
  // freshness-required task may reuse a family already used for practice.
  if (mission?.assessmentPlan?.freshnessRequired) {
    const practiced = new Set(
      missionTasks.filter((t) => t.freshness?.familyClass === 'practiced').map((t) => t.promptFamily)
    );
    for (const t of missionTasks.filter((t) => t.freshness?.required)) {
      if (practiced.has(t.promptFamily)) {
        p.push(`task '${t.id}' reuses practiced family '${t.promptFamily}' — teaching cannot leak into ${t.freshness.familyClass}`);
      }
    }
  }
  return p;
}

/* ── Content-load validation ──────────────────────────────── */

/* Task language must be DECLARED by the mission itself — in
 * `language.introduced` (what this mission teaches) or
 * `language.assumedKnown` (structured per kind). A capability's own
 * language list is NOT a whitelist: it only describes what the
 * capability targets; whether a mission may use it is the mission's
 * declaration. Undeclared language in a task = a lesson smuggling
 * content past the syllabus. Budgets are injected, never hard-coded. */
export function validateMissionContent(mission, tasks, capabilities, policy = {}) {
  const p = [];
  const assumed = mission.language?.assumedKnown;
  if (assumed != null && (Array.isArray(assumed) || typeof assumed !== 'object')) {
    p.push('language.assumedKnown must be structured { chunks, vocabulary, constructions } — a flat list cannot be typed');
  }
  const known = {
    chunks: new Set(mission.language?.introduced?.chunks ?? []),
    vocabulary: new Set(mission.language?.introduced?.vocabulary ?? []),
    constructions: new Set(mission.language?.introduced?.constructions ?? [])
  };
  if (assumed && typeof assumed === 'object' && !Array.isArray(assumed)) {
    for (const x of assumed.chunks ?? []) known.chunks.add(x);
    for (const x of assumed.vocabulary ?? []) known.vocabulary.add(x);
    for (const x of assumed.constructions ?? []) known.constructions.add(x);
  }

  const needs = [
    ['requiredChunks', 'chunks'],
    ['requiredVocabulary', 'vocabulary'],
    ['requiredConstructions', 'constructions']
  ];
  // Every task claiming this mission must respect the declaration —
  // even one missing from taskIds. Ghost tasks cannot satisfy evidence
  // paths (validateMission scopes those to taskIds), but they also
  // cannot smuggle undeclared language past the syllabus.
  for (const t of tasks) {
    if (t.missionId !== mission.id) continue;
    for (const [field, bucket] of needs) {
      for (const item of t.language?.[field] ?? []) {
        if (!known[bucket].has(item)) {
          p.push(`task '${t.id}' requires undeclared ${bucket} '${item}'`);
        }
      }
    }
  }

  const budgets = [
    ['maxNewChunks', 'chunks'],
    ['maxNewVocabulary', 'vocabulary'],
    ['maxNewConstructions', 'constructions']
  ];
  for (const [key, bucket] of budgets) {
    const limit = policy[key];
    if (limit != null) {
      const n = (mission.language?.introduced?.[bucket] ?? []).length;
      if (n > limit) p.push(`introduced ${bucket} (${n}) exceeds policy ${key}=${limit}`);
    }
  }
  return p;
}
