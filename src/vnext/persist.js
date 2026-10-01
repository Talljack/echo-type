/*
 * vNext append-only event persistence (issue #53, research R3 on #49).
 *
 * One job: the learner's evidence log survives a reload and replays
 * into the SAME projection and the SAME claim.
 *
 *   append(event) exactly-once logically
 *     → reload → loadEvents → replay → identical state
 *
 * Layout: users/{uid}/vnext_events/{eventId}
 *
 *   - doc id = event.id → re-delivery of the same event is a logical
 *     no-op, verified by content fingerprint (a retry after a lost ack
 *     is deduped, never double-counted);
 *   - create + read only — update and delete are denied by rules:
 *     evidence is immutable, a client can never rewrite history;
 *   - owner_id pins to the path uid and learner_id pins to the same
 *     uid: nobody writes evidence for another learner;
 *   - occurred_at/recorded_at both stored: the lag engine reasons
 *     about comes from occurred_at (client-observed), recorded_at is
 *     server-arrival provenance — they are never conflated;
 *   - events come back sorted by (occurredAt, id), which is the
 *     canonical replay order the projection already applies.
 *
 * The adapter takes the same `fs` surface as cloud-compat
 * ({ db, doc, collection, getDoc, getDocs, runTransaction,
 * serverTimestamp }) so it runs against the emulator, a fake, or the
 * real SDK without branching.
 */

export const VNEXT_EVENTS_SCHEMA = 1;

export const vnextEventsPath = (uid) => `users/${uid}/vnext_events`;
export const vnextEventPath = (uid, eventId) => `${vnextEventsPath(uid)}/${eventId}`;

/* camelCase engine event ↔ snake_case document. Extra document fields
 * are provenance only; the replayed event is reconstructed exactly. */
export function toEventDoc(event, uid, { missionRunId = null, policyVersion = null, recordedAt } = {}) {
  return {
    id: event.id,
    owner_id: uid,
    learner_id: event.learnerId,
    capability_id: event.capabilityId,
    task_id: event.taskId,
    task_revision: event.taskRevision,
    event_type: event.eventType,
    modality: event.modality,
    occurred_at: event.occurredAt,
    recorded_at: recordedAt ?? null,
    schema_version: VNEXT_EVENTS_SCHEMA,
    policy_version: policyVersion ?? null,
    mission_run_id: missionRunId ?? event.missionRunId ?? null,
    context: event.context ?? null,
    attempt: event.attempt ?? null,
    support: event.support ?? null,
    feedback: event.feedback ?? null,
    evaluation: event.evaluation ?? null,
    binding: event.binding ?? null
  };
}

export function fromEventDoc(d) {
  const e = {
    id: d.id,
    learnerId: d.learner_id,
    capabilityId: d.capability_id,
    taskId: d.task_id,
    taskRevision: d.task_revision,
    eventType: d.event_type,
    modality: d.modality,
    occurredAt: d.occurred_at,
    context: d.context ?? null,
    attempt: d.attempt ?? null,
    support: d.support ?? null,
    feedback: d.feedback ?? null,
    evaluation: d.evaluation ?? null,
    binding: d.binding ?? null
  };
  if (d.mission_run_id != null) e.missionRunId = d.mission_run_id;
  return e;
}

/* Content fingerprint for idempotent retry: everything the event
 * carries EXCEPT arrival provenance (recorded_at is expected to differ
 * between a first attempt and its retry). */
const FINGERPRINT_FIELDS = [
  'id', 'owner_id', 'learner_id', 'capability_id', 'task_id', 'task_revision',
  'event_type', 'modality', 'occurred_at', 'schema_version', 'policy_version',
  'mission_run_id', 'context', 'attempt', 'support', 'feedback', 'evaluation', 'binding'
];

const fingerprint = (d) =>
  JSON.stringify(FINGERPRINT_FIELDS.map((k) => [k, d[k] ?? null]));

export function eventDocMatches(docData, expected) {
  return fingerprint(docData) === fingerprint(expected);
}

/* Append events idempotently. Each event is its own transaction: the
 * doc either does not exist (create it) or exists with identical
 * content (a retried write — dedupe silently). An existing doc with
 * DIFFERENT content is a real conflict and throws — evidence identity
 * is not last-write-wins. Returns { appended, deduped }. */
export async function appendVnextEvents(fs, uid, events, opts = {}) {
  let appended = 0;
  let deduped = 0;
  for (const event of events) {
    const data = toEventDoc(event, uid, { ...opts, recordedAt: fs.serverTimestamp() });
    const ref = fs.doc(fs.db, vnextEventPath(uid, event.id));
    await fs.runTransaction(fs.db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        if (!eventDocMatches(snap.data(), data)) {
          throw new Error(`vnext event conflict '${event.id}' — same id, different content; refusing to overwrite evidence`);
        }
        deduped++;
        return;
      }
      tx.set(ref, data);
      appended++;
    });
  }
  return { appended, deduped };
}

/* Full log for one learner, in canonical replay order (occurredAt,id).
 * The projection re-sorts anyway — this order is for callers that
 * stream or diff logs directly. */
export async function loadVnextEvents(fs, uid) {
  const snap = await fs.getDocs(fs.collection(fs.db, vnextEventsPath(uid)));
  const events = snap.docs.map((d) => fromEventDoc(d.data()));
  events.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return events;
}

/* ── Decision audit records (mission 008C, spec §11–§13) ─────────────
 *
 * users/{uid}/vnext_decisions/{decisionId}
 *
 * Compact append-only provenance for consumed Next For You decisions:
 * identities, versions, the canonical input digest, episode/session
 * ids, the chosen kind, reason codes, and the shadow comparison when
 * the run served REFERENCE while B0 evaluated the same state.
 *
 *   - doc id = record.decisionId → identical re-delivery dedupes, a
 *     conflicting same-id write throws (audit identity is not
 *     last-write-wins — same boundary as the event log);
 *   - create + read only — update and delete are denied by rules;
 *   - owner_id pins to the path uid; learner_id pins to the same uid;
 *   - NO full canonical input snapshot (§13): the digest + version/
 *     revision identities are the join keys back to the append-only
 *     event log and versioned contracts.
 */
export const VNEXT_DECISIONS_SCHEMA = 1;

export const vnextDecisionsPath = (uid) => `users/${uid}/vnext_decisions`;
export const vnextDecisionPath = (uid, decisionId) => `${vnextDecisionsPath(uid)}/${decisionId}`;

export function toDecisionDoc(record, uid, { recordedAt } = {}) {
  return {
    id: record.decisionId,
    owner_id: uid,
    learner_id: record.learnerId,
    mission_id: record.missionId ?? null,
    mission_revision: record.missionRevision ?? null,
    task_id: record.taskId ?? null,
    task_revision: record.taskRevision ?? null,
    capability_id: record.capabilityId ?? null,
    selection_policy_version: record.selectionPolicyVersion ?? null,
    learning_policy_version: record.learningPolicyVersion ?? null,
    decision_input_digest: record.decisionInputDigest ?? null,
    decision_episode_id: record.decisionEpisodeId ?? null,
    session_id: record.sessionId ?? null,
    mission_run_id: record.missionRunId ?? null,
    chosen_kind: record.chosenKind ?? null,
    decision_at: record.timestamp ?? null,
    recorded_at: recordedAt ?? null,
    schema_version: VNEXT_DECISIONS_SCHEMA,
    reason_codes: record.reasonCodes ?? null,
    shadow: record.shadow ?? null,
    context_version: record.contextVersion ?? null
  };
}

export function fromDecisionDoc(d) {
  return {
    decisionId: d.id,
    learnerId: d.learner_id,
    missionId: d.mission_id ?? null,
    missionRevision: d.mission_revision ?? null,
    taskId: d.task_id ?? null,
    taskRevision: d.task_revision ?? null,
    capabilityId: d.capability_id ?? null,
    selectionPolicyVersion: d.selection_policy_version ?? null,
    learningPolicyVersion: d.learning_policy_version ?? null,
    decisionInputDigest: d.decision_input_digest ?? null,
    decisionEpisodeId: d.decision_episode_id ?? null,
    sessionId: d.session_id ?? null,
    missionRunId: d.mission_run_id ?? null,
    chosenKind: d.chosen_kind ?? null,
    timestamp: d.decision_at ?? null,
    reasonCodes: d.reason_codes ?? null,
    shadow: d.shadow ?? null,
    contextVersion: d.context_version ?? null
  };
}

const DECISION_DOC_FIELDS = [
  'id', 'owner_id', 'learner_id', 'mission_id', 'mission_revision',
  'task_id', 'task_revision', 'capability_id', 'selection_policy_version',
  'learning_policy_version', 'decision_input_digest', 'decision_episode_id',
  'session_id', 'mission_run_id', 'chosen_kind', 'decision_at',
  'schema_version', 'reason_codes', 'shadow', 'context_version'
];

const decisionDocFingerprint = (d) =>
  JSON.stringify(DECISION_DOC_FIELDS.map((k) => [k, d[k] ?? null]));

export function decisionDocMatches(docData, expected) {
  return decisionDocFingerprint(docData) === decisionDocFingerprint(expected);
}

/* Append one audit record idempotently: create if absent, dedupe an
 * identical re-delivery, throw on same-id/different-content. */
export async function appendVnextDecision(fs, uid, record, opts = {}) {
  const data = toDecisionDoc(record, uid, { ...opts, recordedAt: fs.serverTimestamp() });
  const ref = fs.doc(fs.db, vnextDecisionPath(uid, record.decisionId));
  return fs.runTransaction(fs.db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      if (!decisionDocMatches(snap.data(), data)) {
        throw new Error(`vnext decision conflict '${record.decisionId}' — same id, different content; refusing to overwrite audit`);
      }
      return { appended: 0, deduped: 1 };
    }
    tx.set(ref, data);
    return { appended: 1, deduped: 0 };
  });
}

export async function loadVnextDecisions(fs, uid) {
  const snap = await fs.getDocs(fs.collection(fs.db, vnextDecisionsPath(uid)));
  return snap.docs
    .map((d) => fromDecisionDoc(d.data()))
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.decisionId < b.decisionId ? -1 : 1));
}
