/*
 * TypeScript surfaces for the vendored FlashDay evidence kernel.
 *
 * The kernel (src/vnext/*.js) is authoritative and evolves upstream —
 * these interfaces cover only the fields the evidence bridge and its
 * consumers depend on, not a full re-declaration of kernel internals.
 */

/** A registered capability contract (kernel-authored). */
export interface KernelCapability {
  id: string;
  modality: string;
  prerequisites: string[];
  conditions?: { supportAllowed?: string[] } & Record<string, unknown>;
  [key: string]: unknown;
}

/** A registered task contract (kernel-authored). */
export interface KernelTask {
  id: string;
  revision: number;
  capabilityId: string;
  missionId?: string | null;
  modality: string;
  purpose: string;
  promptFamily?: string;
  evaluation?: { authority?: string; contractId?: string | null };
  response?: { type?: string | null; requiredFunctions?: string[] };
  freshness?: { required?: boolean; familyClass?: string };
  [key: string]: unknown;
}

/** A registered mission contract (kernel-authored). */
export interface KernelMission {
  id: string;
  taskIds: string[];
  targetCapabilities: string[];
  [key: string]: unknown;
}

/** The immutable evidence record — append-only, kernel-defined. */
export interface EvidenceEvent {
  id: string;
  learnerId: string;
  capabilityId: string;
  taskId: string;
  taskRevision: number;
  eventType: string;
  modality: string;
  occurredAt: number;
  context?: {
    missionId?: string | null;
    practicedOrTransfer?: string;
    promptFamily?: string;
    partnerType?: string | null;
  };
  attempt?: {
    observed?: boolean;
    outcome?: 'success' | 'partial' | 'fail' | null;
    response?: unknown;
    latencyMs?: number;
    attemptId?: string;
  } | null;
  support?: Record<string, unknown> | null;
  feedback?: unknown;
  evaluation?: {
    authority: string;
    contractId: string | null;
    evaluator: string | null;
    version: string | null;
    missingFunctions: string[];
  };
  binding?: {
    purpose?: string;
    familyClass?: string;
    freshnessRequired?: boolean;
    effectiveSupportAllowed?: string[];
  };
  missionRunId?: string | null;
}

/** The store surface the kernel expects (mirrors store-memory.js). */
export interface EventStore {
  append(events: EvidenceEvent[]): Promise<{ appended: number; deduped: number }>;
  list(): Promise<EvidenceEvent[]>;
}

export interface CapabilitySlot {
  state: 'NOT_SEEN' | 'EXPOSED' | 'SUPPORTED' | 'INDEPENDENT' | 'RETAINED' | 'TRANSFERRED' | 'FLUENT';
  milestones: {
    exposed: boolean;
    supported: boolean;
    independent: boolean;
    retained: boolean;
    transferred: boolean;
    fluent: boolean;
  };
  lastEventAt: number | null;
  lastAttemptOutcome: string | null;
  consecutiveFailures: number;
  firstIndependentAt: number | null;
  lastIndependentSuccessAt: number | null;
  rehearsedPromptFamilies: string[];
  transferPromptFamilies: string[];
}

export interface LearnerProjection {
  learnerId: string;
  byCapability: Map<string, CapabilitySlot>;
  generatedFrom: number;
  policyVersion: string;
}

export interface NextTaskDecision {
  status: 'ready' | 'blocked' | string;
  taskId: string | null;
  taskRevision?: number | null;
  capabilityId?: string | null;
  purpose?: string | null;
  reason: string;
  skippedIntents?: string[];
  [key: string]: unknown;
}

/**
 * Observed reality only. The caller names WHICH contract produced the
 * observation (taskId) and reports what actually happened — response,
 * support used, feedback, timing. It may never supply semantics:
 * capabilityId, purpose, context, freshness, transfer and binding are
 * contract-derived, and `outcome` is honored only when the task's
 * declared evaluation authority is not deterministic (a self-report or
 * ASR authority honestly labels the caller's report; a deterministic
 * contract always re-scores the response itself).
 */
export interface AttemptSubmission {
  learnerId: string;
  /** Resolves the registered TaskContract — the only contract handle. */
  taskId: string;
  occurredAt: number;
  /** Stable event id. Supply on retries for idempotent redelivery;
   * defaults to `evt.<attemptId>` or a fresh UUID. */
  id?: string;
  eventType?: string;
  /** Learner production: text, `{ text }`, or `{ optionId }`. */
  response?: unknown;
  /** Reported outcome — consulted ONLY for non-deterministic
   * authorities (self_report / asr / ai_llm / human). */
  outcome?: 'success' | 'partial' | 'fail' | null;
  /** Cross-attempt key: retries and follow-ups on the same attempt
   * share it; required on assessment-purpose tasks. */
  attemptId?: string;
  latencyMs?: number;
  support?: Record<string, unknown>;
  feedback?: unknown;
  partnerType?: string;
  /** Evaluator identity/version for provenance — never authority. */
  evaluation?: { evaluator?: string; version?: string; missingFunctions?: string[] };
}

export interface ObservationSubmission {
  learnerId: string;
  taskId: string;
  occurredAt: number;
  id?: string;
  /** 'exposure' | 'support_use' | 'feedback' — kernel-enforced. */
  eventType?: string;
  attempt?: Record<string, unknown>;
  support?: Record<string, unknown>;
  feedback?: unknown;
  partnerType?: string;
  evaluation?: { evaluator?: string; version?: string };
}

export interface ContractRegistry {
  tasks: KernelTask[];
  capabilities: KernelCapability[];
  missions: KernelMission[];
  taskById(id: string): KernelTask | undefined;
  capabilityById(id: string): KernelCapability | undefined;
  missionById(id: string): KernelMission | undefined;
}
