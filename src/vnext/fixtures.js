/*
 * vNext headless fixtures (issue #45 §13–14).
 *
 * Two complete missions as pure domain data — no screens, no UI. The
 * learning loop is expressed as *task phases*: baseline diagnostic →
 * meaningful input → retrieval → supported interaction → feedback →
 * clean independent attempt → delayed retrieval → changed-context
 * transfer → fresh assessment.
 *
 * Fixture A: meet a new person.  Fixture B: order one drink.
 *
 * Prompt families use the canonical id scheme
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.<sigHash8>.vN
 * and every task carries a contextSignature — the family's auditable
 * identity. `canonicalFamilyId` derives the id FROM the signature, so
 * the two can never drift apart by construction; the trailing hash is
 * an injective fingerprint over the whole signature so two families
 * that differ only in a non-id field (interlocutorRole, relationship,
 * responseTopology, lexicalDomain) still get distinct ids.
 * `tests/vnext-curriculum.test.mjs` enforces all of this via
 * curriculum-checks.js.
 *
 * Mission roles (R6): targets owe a baseline probe and the full
 * evidence package; carriers are rehearsed opportunistically — they get
 * input + eliciting practice but NO baseline diagnostic, no
 * fresh-transfer task and no assessment of their own; supports are
 * demand-driven and only declared when a mechanism exists to route to
 * them.
 */
import { capabilityById } from './capabilities.js';
import { canonicalFamilyId, makeMission, makeTask } from './contracts.js';

/* evaluation.contractId names a scoring SPEC (evaluators.js), not a
 * task: choice tasks score the picked option; free-response tasks score
 * their declared requiredFunctions by structured match. Exposure-only
 * tasks declare no evaluator — there is nothing to score. */
const task = (fields) => makeTask({
  evaluation: {
    authority: 'deterministic',
    contractId: fields.purpose === 'input' || fields.purpose === 'notice'
      ? null
      : fields.response?.type === 'choice'
        ? 'eval.choice.correct.v1'
        : 'eval.required_functions.v1'
  },
  ...fields
});

/* The practiced communicative situation both missions start from: a
 * casual, face-to-face first meeting between new peers. Baseline
 * diagnostics deliberately sample the SAME families the teaching
 * rehearses, so the delta between baseline and later evidence is the
 * teaching, not the context. */
const FIRST_MEETING = {
  setting: 'personal',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'new_peer',
  relationship: 'first_meeting'
};

const sig = (fields) => ({ ...FIRST_MEETING, ...fields });

/* Context signatures are the source of truth for a prompt family — one
 * const per family, shared by every task that rehearses it. The id is
 * then derived: pf(capId, SIG.x). */
const F = {
  greetingExchange: sig({
    communicativeFunction: 'recognize_greeting',
    cueTopology: 'greeting_exchange',
    responseTopology: 'none',
    lexicalDomain: 'greetings'
  }),
  identityQExchange: sig({
    communicativeFunction: 'understand_identity_question',
    cueTopology: 'identity_q_exchange',
    responseTopology: 'none',
    lexicalDomain: 'identity'
  }),
  identityQAudio: sig({
    communicativeFunction: 'understand_identity_question',
    cueTopology: 'identity_q_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'identity'
  }),
  ownNameAsked: sig({
    communicativeFunction: 'state_own_name',
    cueTopology: 'asked_own_name',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }),
  ownNameCued: sig({
    communicativeFunction: 'state_own_name',
    cueTopology: 'cued_recall',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }),
  ownNameCheck: {
    communicativeFunction: 'state_own_name',
    cueTopology: 'name_check',
    setting: 'educational',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'teacher',
    relationship: 'first_meeting',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  },
  askNameIntro: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'self_intro',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNameModel: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'model_exchange',
    responseTopology: 'none',
    lexicalDomain: 'identity'
  }),
  askNameCued: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'cued_recall',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNamePartner: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'partner_exchange',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNameStreet: {
    communicativeFunction: 'ask_name',
    cueTopology: 'open_social',
    setting: 'street',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'stranger',
    relationship: 'first_meeting',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  },
  askNameFull: {
    communicativeFunction: 'full_name_exchange',
    cueTopology: 'full_exchange',
    setting: 'community',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'acquaintance',
    relationship: 'repeat_contact',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  },
  politeNice: sig({
    communicativeFunction: 'respond_to_introduction',
    cueTopology: 'nice_to_meet_you',
    responseTopology: 'politeness_return',
    lexicalDomain: 'greetings'
  }),
  /* 008E: genuinely fresh assessment context for say_own_name — an
   * organizer requesting the learner's name at a community sign-up.
   * Different cue topology, setting, register and partner; the
   * learner-visible situation line carries the held-out context while
   * the English cue stays deliberately practiced (008E R2). */
  ownNameSignup: {
    communicativeFunction: 'state_own_name',
    cueTopology: 'signup_name_request',
    setting: 'community',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'organizer',
    relationship: 'first_meeting',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }
};

const pf = canonicalFamilyId;

/* ── Fixture A — Meet a new person ─────────────────────────── */

export const MISSION_MEET_PERSON = makeMission({
  id: 'mission.meet_new_person',
  revision: 4,
  scenario: 'Meet another learner for the first time.',
  learnerGoal: 'Exchange a greeting and names politely.',
  /* Claim-bearing targets: the mission owes each of them a baseline
   * probe plus practiced, delayed, held-out transfer and
   * fresh-assessment coverage. */
  targetCapabilities: [
    'production.speak.say_own_name',
    'interaction.ask_name'
  ],
  /* Carriers are rehearsed for retention and context — they get
   * input/eliciting evidence opportunistically but no baseline probe,
   * no held-out transfer and no assessment of their own. */
  carrierCapabilities: [
    'reception.listen.greeting_basic',
    'reception.listen.identity_question_basic',
    'interaction.respond_to_introduction'
  ],
  /* interaction.ask_repeat is deliberately NOT declared: supports are
   * demand-driven, and no mechanism yet routes a learner to repair
   * work — declaring it would be a dead surface the planner can never
   * serve. */
  supportCapabilities: [],
  language: {
    assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
    introduced: {
      chunks: [
        'Hi', 'Hello', "I'm …", 'My name is …', "What's your name?",
        'Nice to meet you', 'Nice to meet you too'
      ],
      vocabulary: ['name', 'nice', 'meet', 'hi', 'hello'],
      constructions: ['wh_question_name']
    }
  },
  taskIds: [
    'task.meet.diagnostic.own_name',
    'task.meet.diagnostic.ask_name',
    'task.meet.input.scene',
    'task.meet.input.questions',
    'task.meet.input.ask_name',
    'task.meet.retrieval.questions',
    'task.meet.retrieval.phrases',
    'task.meet.retrieval.ask_name',
    'task.meet.interaction.guided',
    'task.meet.remediation.ask_name',
    'task.meet.interaction.unaided',
    'task.meet.interaction.polite',
    'task.meet.delayed.check',
    'task.meet.delayed.name',
    'task.meet.transfer.street',
    'task.meet.transfer.name',
    'task.meet.assessment.name_signup',
    'task.meet.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_MEET_PERSON = [
  task({
    id: 'task.meet.diagnostic.own_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: pf('production.speak.say_own_name', F.ownNameAsked),
    contextSignature: F.ownNameAsked,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.ask_name', F.askNameIntro),
    contextSignature: F.askNameIntro,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.input.scene',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.greeting_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.greeting_basic', F.greetingExchange),
    contextSignature: F.greetingExchange,
    stimulus: { type: 'dialogue', languageComponents: ['Hi', 'Hello'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.input.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.identity_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.identity_question_basic', F.identityQExchange),
    contextSignature: F.identityQExchange,
    stimulus: { type: 'dialogue', languageComponents: ["What's your name?"] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.input.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.ask_name', F.askNameModel),
    contextSignature: F.askNameModel,
    stimulus: { type: 'dialogue', languageComponents: ["What's your name?", 'My name is …'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["What's your name?", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.identity_question_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.identity_question_basic', F.identityQAudio),
    contextSignature: F.identityQAudio,
    stimulus: { type: 'audio_line', languageComponents: ["What's your name?"] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_identity_question'],
      options: [
        { id: 'ask_name', text: 'Họ đang hỏi tên của bạn.', correct: true },
        { id: 'greeting', text: 'Họ đang chào hỏi bạn.' },
        { id: 'ask_age', text: 'Họ đang hỏi tuổi của bạn.' }
      ]
    },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.phrases',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.say_own_name', F.ownNameCued),
    contextSignature: F.ownNameCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["I'm …"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.retrieval.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.ask_name', F.askNameCued),
    contextSignature: F.askNameCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.guided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.remediation.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'remediation',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: [] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.unaided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.polite',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.respond_to_introduction',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.respond_to_introduction', F.politeNice),
    contextSignature: F.politeNice,
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['respond_to_introduction'] },
    language: { requiredChunks: ['Nice to meet you too'], requiredVocabulary: ['nice', 'meet'], requiredConstructions: [] }
  }),
  /* Delayed re-checks re-probe the REHEARSED family after the retention
   * lag — a delayed task on a novel family would measure transfer, not
   * retention, so its family deliberately equals the last independent
   * exchange's family. */
  task({
    id: 'task.meet.delayed.check',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.delayed.name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'delayed_retrieval',
    promptFamily: pf('production.speak.say_own_name', F.ownNameAsked),
    contextSignature: F.ownNameAsked,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  /* Held-out transfer: the same communicative function in a context
   * whose declared deltas (wording→cueTopology, partner→interlocutorRole,
   * setting→setting) all differ from every rehearsed family. */
  task({
    id: 'task.meet.transfer.street',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.ask_name', F.askNameStreet),
    contextSignature: F.askNameStreet,
    stimulus: { type: 'partner_turn', languageComponents: ["I'm Sam — and you are?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.transfer.name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'transfer',
    promptFamily: pf('production.speak.say_own_name', F.ownNameCheck),
    contextSignature: F.ownNameCheck,
    stimulus: { type: 'partner_turn', languageComponents: ['Tell me your name.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['My name is …', "I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  /* 008E: direct fresh-assessment sample for say_own_name — the
   * capability was covered only transitively inside the multi-cap
   * checkpoint; this single-capability probe measures it post-transfer
   * in a context no teaching task rehearses. */
  task({
    id: 'task.meet.assessment.name_signup',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'assessment',
    promptFamily: pf('production.speak.say_own_name', F.ownNameSignup),
    contextSignature: F.ownNameSignup,
    /* 008E R2: the cue is the mission's rehearsed direct name question —
     * held-out novelty lives in the LEARNER-VISIBLE situation (organizer
     * at a community sign-up), not in cue vocabulary. A novel cue would
     * measure comprehension, not say_own_name. */
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['production.speak.say_own_name'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["I'm …", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.assessment.checkpoint',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.ask_name', F.askNameFull),
    contextSignature: F.askNameFull,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! Good to see you.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet', 'state_own_name', 'ask_name'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.ask_name', 'production.speak.say_own_name', 'interaction.respond_to_introduction'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["What's your name?", "I'm …"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  })
];

/* ── Fixture B — Order one drink ───────────────────────────── */

export const MISSION_ORDER_DRINK = makeMission({
  id: 'mission.order_drink',
  revision: 3,
  scenario: 'Order one drink politely in a cafe.',
  learnerGoal: 'Understand the offer question and order a drink.',
  targetCapabilities: ['interaction.request_item'],
  carrierCapabilities: ['reception.listen.drink_order_question_basic'],
  pedagogy: { recommendedAfterMissions: ['mission.meet_new_person'] },
  // No support capabilities declared — supports are demand-driven and
  // no mechanism yet routes to them; a dead surface only produces
  // planner intents the mission must block on.
  supportCapabilities: [],
  language: {
    assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
    introduced: {
      chunks: ['What would you like?', 'Can I have …?', 'A coffee, please', 'Anything else?'],
      vocabulary: ['like', 'drink', 'coffee', 'tea', 'please'],
      constructions: []
    }
  },
  taskIds: [
    'task.drink.diagnostic.order',
    'task.drink.input.counter',
    'task.drink.retrieval.offer',
    'task.drink.retrieval.order',
    'task.drink.interaction.guided',
    'task.drink.interaction.unaided',
    'task.drink.delayed.check',
    'task.drink.transfer.stall',
    'task.drink.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

const CAFE = {
  setting: 'cafe',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'server',
  relationship: 'service'
};

const cafeSig = (fields) => ({ ...CAFE, ...fields });

const DF = {
  offerAudio: cafeSig({
    communicativeFunction: 'understand_offer_or_order_question',
    cueTopology: 'offer_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'food_drink'
  }),
  serviceExchange: cafeSig({
    communicativeFunction: 'understand_offer_or_order_question',
    cueTopology: 'service_exchange',
    responseTopology: 'none',
    lexicalDomain: 'food_drink'
  }),
  offerQuestion: cafeSig({
    communicativeFunction: 'request_item',
    cueTopology: 'offer_question',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  cuedRecall: cafeSig({
    communicativeFunction: 'request_item',
    cueTopology: 'cued_recall',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  openCounter: {
    communicativeFunction: 'request_item',
    cueTopology: 'open_counter',
    setting: 'stall',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'vendor',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  },
  counterKiosk: {
    communicativeFunction: 'request_item',
    cueTopology: 'counter_exchange',
    setting: 'kiosk',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'server',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }
};

export const TASKS_ORDER_DRINK = [
  task({
    id: 'task.drink.diagnostic.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.input.counter',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.drink_order_question_basic', DF.serviceExchange),
    contextSignature: DF.serviceExchange,
    stimulus: { type: 'dialogue', languageComponents: ['What would you like?', 'A coffee, please'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['What would you like?', 'A coffee, please'], requiredVocabulary: ['like', 'coffee', 'please'], requiredConstructions: [] }
  }),
  /* The carrier's comprehension check is post-input practice, not a
   * baseline probe: carriers rehearse opportunistically, so this is a
   * retrieval task over the offer question — the only eliciting unit
   * the carrier needs to unlock the target's diagnostic. */
  task({
    id: 'task.drink.retrieval.offer',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.drink_order_question_basic', DF.offerAudio),
    contextSignature: DF.offerAudio,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_offer_or_order_question'],
      options: [
        { id: 'offer', text: 'Họ hỏi bạn muốn gọi gì.', correct: true },
        { id: 'greeting', text: 'Họ chào hỏi bạn.' },
        { id: 'bill', text: 'Họ đưa bạn hóa đơn.' }
      ]
    },
    language: { requiredChunks: ['What would you like?'], requiredVocabulary: ['like'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.retrieval.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.request_item', DF.cuedRecall),
    contextSignature: DF.cuedRecall,
    stimulus: { type: 'cued_prompt', languageComponents: ['Can I have …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.guided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.unaided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.delayed.check',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['Anything else?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.transfer.stall',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.request_item', DF.openCounter),
    contextSignature: DF.openCounter,
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.assessment.checkpoint',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.request_item', DF.counterKiosk),
    contextSignature: DF.counterKiosk,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! For you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.request_item'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  })
];

/* ── Fixture C — Meet at a time (R6 mission 3) ─────────────── */

const MEETUP = {
  setting: 'personal',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'classmate',
  relationship: 'repeat_contact'
};

const meetupSig = (fields) => ({ ...MEETUP, ...fields });

const TF = {
  greetQAudio: meetupSig({
    communicativeFunction: 'recognize_greeting',
    cueTopology: 'greeting_q_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'greetings'
  }),
  greetMeetup: meetupSig({
    communicativeFunction: 'greet',
    cueTopology: 'greeting_exchange',
    responseTopology: 'greeting_return',
    lexicalDomain: 'greetings'
  }),
  askNameMeetup: meetupSig({
    communicativeFunction: 'ask_name',
    cueTopology: 'name_exchange',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  timeQDialogue: meetupSig({
    communicativeFunction: 'understand_clock_time',
    cueTopology: 'time_q_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'time'
  }),
  timeQAudio: meetupSig({
    communicativeFunction: 'understand_clock_time',
    cueTopology: 'time_q_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'time'
  }),
  timeSayAsked: meetupSig({
    communicativeFunction: 'state_clock_time',
    cueTopology: 'asked_clock_time',
    responseTopology: 'time_statement',
    lexicalDomain: 'time'
  }),
  timeSayCued: meetupSig({
    communicativeFunction: 'state_clock_time',
    cueTopology: 'cued_recall',
    responseTopology: 'time_statement',
    lexicalDomain: 'time'
  }),
  timeSayPartner: meetupSig({
    communicativeFunction: 'state_clock_time',
    cueTopology: 'partner_exchange',
    responseTopology: 'time_statement',
    lexicalDomain: 'time'
  }),
  /* R6 transfer signatures: staff confirms an appointment time (hear),
   * an attendee asks when something starts (say). */
  timeClinic: {
    communicativeFunction: 'understand_clock_time',
    cueTopology: 'appointment_confirmation',
    setting: 'clinic',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'receptionist',
    relationship: 'repeat_contact',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'time'
  },
  timeEvent: {
    communicativeFunction: 'state_clock_time',
    cueTopology: 'schedule_info_request',
    setting: 'community_event',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'attendee',
    relationship: 'repeat_contact',
    responseTopology: 'time_statement',
    lexicalDomain: 'time'
  },
  timeAnnounce: {
    communicativeFunction: 'understand_clock_time',
    cueTopology: 'closing_time_announcement',
    setting: 'shop',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'staff',
    relationship: 'service',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'time'
  },
  timePlan: {
    communicativeFunction: 'state_clock_time',
    cueTopology: 'meetup_plan',
    setting: 'community',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'acquaintance',
    relationship: 'repeat_contact',
    responseTopology: 'time_statement',
    lexicalDomain: 'time'
  },
  /* #61 support-probe family: hearing a bare number inside a short
   * utterance — the substrate the clock-time comprehension tasks
   * depend on. Practiced class: probes are never held-out evidence. */
  numberSpot: meetupSig({
    communicativeFunction: 'identify_spoken_number',
    cueTopology: 'number_in_utterance_audio',
    responseTopology: 'mc_number',
    lexicalDomain: 'time'
  })
};

export const MISSION_MEET_AT_TIME = makeMission({
  id: 'mission.meet_at_a_time',
  revision: 2,
  scenario: 'Arrange a time to meet a classmate.',
  learnerGoal: 'Understand a stated time and say a time to meet.',
  targetCapabilities: [
    'reception.listen.understand_clock_time',
    'production.speak.state_clock_time'
  ],
  /* greeting_basic is a carrier like the spoken caps — rehearsed via
   * one comprehension check, never claim-bearing here. No capability
   * gates on evidence from earlier missions: the only edges are
   * curriculum order (pedagogy), not capability dependencies (R7). */
  carrierCapabilities: [
    'interaction.greet',
    'interaction.ask_name',
    'reception.listen.greeting_basic'
  ],
  /* identify_spoken_number is demand-routed substrate (#61): it is NOT
   * introduced, baselined or claimed here — a support_demand intent may
   * serve its probe only when an attributing target failure names the
   * function. Gate-verified live: the clock-time choice tasks genuinely
   * require catching a number word. */
  supportCapabilities: ['reception.listen.identify_spoken_number'],
  pedagogy: { recommendedAfterMissions: ['mission.order_drink'] },
  language: {
    assumedKnown: {
      chunks: ['Hi', 'Hello', "What's your name?"],
      vocabulary: ['name', 'hi', 'hello'],
      constructions: ['wh_question_name']
    },
    introduced: {
      chunks: ['What time is it?', "It's … o'clock", 'half past …', 'See you at …', 'Good to see you', 'at …', 'at half past …', 'at … o’clock'],
      vocabulary: ['time', 'one', 'two', 'three', 'four', 'six', 'nine', 'ten', 'half', 'eight'],
      constructions: []
    }
  },
  taskIds: [
    'task.time.diagnostic.hear',
    'task.time.diagnostic.say',
    'task.time.input.scene',
    'task.time.input.clock',
    'task.time.retrieval.greeting',
    /* Remediation precedes the re-drill it repairs: when refresh or
     * correction mints after an attributed miss, the first unconsumed
     * repair surface must be the remediation task, not the drill. */
    'task.time.remediation.hear',
    'task.time.retrieval.hear',
    'task.time.retrieval.say',
    'task.time.retrieval.greet',
    'task.time.interaction.ask_name',
    'task.time.interaction.guided',
    'task.time.interaction.unaided',
    'task.time.delayed.hear',
    'task.time.delayed.say',
    'task.time.transfer.clinic',
    'task.time.transfer.event',
    'task.time.assessment.hear',
    'task.time.assessment.checkpoint',
    'task.time.support.number_probe'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_MEET_AT_TIME = [
  task({
    id: 'task.time.diagnostic.hear',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeQAudio),
    contextSignature: TF.timeQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['The class is at three o\u2019clock.'] },
    response: {
      type: 'choice',
      /* Missing the correct option means a required comprehension
       * function did not happen — catching the number word is the
       * substrate the support probe rehearses (#61). */
      requiredFunctions: ['understand_clock_time', 'identify_spoken_number'],
      options: [
        { id: 'three', text: 'Lúc 3 giờ.', correct: true },
        { id: 'four', text: 'Lúc 4 giờ.' },
        { id: 'eight', text: 'Lúc 8 giờ.' }
      ]
    },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['three'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.diagnostic.say',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: pf('production.speak.state_clock_time', TF.timeSayAsked),
    contextSignature: TF.timeSayAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['What time is it?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['time'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.input.scene',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.greet', TF.greetMeetup),
    contextSignature: TF.greetMeetup,
    stimulus: { type: 'dialogue', languageComponents: ['Hi!', 'Hello! How are you?'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.input.clock',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeQDialogue),
    contextSignature: TF.timeQDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['What time is it?', "It's two o'clock.", 'OK — see you at three.'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["It's … o'clock", 'See you at …'], requiredVocabulary: ['time', 'two', 'three'], requiredConstructions: [] }
  }),
  /* greeting_basic is a carrier here — the only eliciting task for it
   * in the whole curriculum is this cheap comprehension check, enough
   * rehearsal to evidence it without claiming it. */
  task({
    id: 'task.time.retrieval.greeting',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.greeting_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.greeting_basic', TF.greetQAudio),
    contextSignature: TF.greetQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Hello! Good to see you.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['recognize_greeting'],
      options: [
        { id: 'greeting', text: 'Họ đang chào hỏi bạn.', correct: true },
        { id: 'question', text: 'Họ đang hỏi bạn một câu.' },
        { id: 'goodbye', text: 'Họ đang tạm biệt bạn.' }
      ]
    },
    language: { requiredChunks: ['Hello', 'Good to see you'], requiredVocabulary: ['hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.retrieval.hear',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeQAudio),
    contextSignature: TF.timeQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Meet me at half past four.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_clock_time', 'identify_spoken_number'],
      options: [
        { id: 'half_four', text: 'Lúc 4 giờ rưỡi.', correct: true },
        { id: 'four', text: 'Lúc 4 giờ.' },
        { id: 'half_five', text: 'Lúc 5 giờ rưỡi.' }
      ]
    },
    language: { requiredChunks: ['half past …'], requiredVocabulary: ['four', 'half'], requiredConstructions: [] }
  }),
  /* Remediation for the clock-time comprehension claim (008D vertical
   * slice): a supported re-encounter on the REHEARSED choice family —
   * repair, not fresh evidence. The attributing choice contract keeps
   * the failure demand-routable (identify_spoken_number substrate), and
   * the slowed single-clause stimulus isolates the number-catch the
   * attributed failure names. */
  task({
    id: 'task.time.remediation.hear',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'remediation',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeQAudio),
    contextSignature: TF.timeQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['The meeting is at eight o\u2019clock.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_clock_time', 'identify_spoken_number'],
      options: [
        { id: 'eight', text: 'Lúc 8 giờ.', correct: true },
        { id: 'nine', text: 'Lúc 9 giờ.' },
        { id: 'two', text: 'Lúc 2 giờ.' }
      ]
    },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['eight'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.retrieval.say',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.state_clock_time', TF.timeSayCued),
    contextSignature: TF.timeSayCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["It's …"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['one', 'two', 'three'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.retrieval.greet',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.greet', TF.greetMeetup),
    contextSignature: TF.greetMeetup,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi!'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet'] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.interaction.ask_name',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_name', TF.askNameMeetup),
    contextSignature: TF.askNameMeetup,
    stimulus: { type: 'partner_turn', languageComponents: ["I'm new here — and you?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.time.interaction.guided',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.state_clock_time', TF.timeSayPartner),
    contextSignature: TF.timeSayPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['What time is it now?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['time'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.interaction.unaided',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.state_clock_time', TF.timeSayPartner),
    contextSignature: TF.timeSayPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Sorry — what time?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['time'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.delayed.hear',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'delayed_retrieval',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeQAudio),
    contextSignature: TF.timeQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['The lesson is at six o\u2019clock.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_clock_time'],
      options: [
        { id: 'six', text: 'Lúc 6 giờ.', correct: true },
        { id: 'seven', text: 'Lúc 7 giờ.' },
        { id: 'ten', text: 'Lúc 10 giờ.' }
      ]
    },
    language: { requiredChunks: ["It's … o'clock"], requiredVocabulary: ['six'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.delayed.say',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'delayed_retrieval',
    promptFamily: pf('production.speak.state_clock_time', TF.timeSayPartner),
    contextSignature: TF.timeSayPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['What time do we meet again?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    language: { requiredChunks: ["It's … o'clock", 'at …'], requiredVocabulary: ['time'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.transfer.clinic',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'transfer',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeClinic),
    contextSignature: TF.timeClinic,
    stimulus: { type: 'audio_line', languageComponents: ['Your appointment is at half past ten.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_clock_time'],
      options: [
        { id: 'half_ten', text: 'Lúc 10 giờ rưỡi.', correct: true },
        { id: 'ten', text: 'Lúc 10 giờ.' },
        { id: 'half_eleven', text: 'Lúc 11 giờ rưỡi.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['at half past …'], requiredVocabulary: ['ten'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.transfer.event',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'transfer',
    promptFamily: pf('production.speak.state_clock_time', TF.timeEvent),
    contextSignature: TF.timeEvent,
    stimulus: { type: 'partner_turn', languageComponents: ['When does the talk start?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_clock_time'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ["It's … o'clock", 'at …'], requiredVocabulary: ['six'], requiredConstructions: [] }
  }),
  /* Fresh assessment is split: comprehension is sampled by a fresh
   * audio choice; the spoken checkpoint samples the production target
   * plus earlier targets now acting as carriers (R6 cumulative
   * checkpoint — previous targets re-sampled as carriers, never as a
   * substitute for the current targets' transfer work). */
  task({
    id: 'task.time.assessment.hear',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.understand_clock_time',
    modality: 'listening',
    purpose: 'assessment',
    promptFamily: pf('reception.listen.understand_clock_time', TF.timeAnnounce),
    contextSignature: TF.timeAnnounce,
    stimulus: { type: 'audio_line', languageComponents: ['We close at nine o\u2019clock.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_clock_time'],
      options: [
        { id: 'nine', text: 'Lúc 9 giờ.', correct: true },
        { id: 'five', text: 'Lúc 5 giờ.' },
        { id: 'eight', text: 'Lúc 8 giờ.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['reception.listen.understand_clock_time'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['at … o\u2019clock'], requiredVocabulary: ['nine'], requiredConstructions: [] }
  }),
  task({
    id: 'task.time.assessment.checkpoint',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'production.speak.state_clock_time',
    modality: 'spoken_production',
    purpose: 'assessment',
    promptFamily: pf('production.speak.state_clock_time', TF.timePlan),
    contextSignature: TF.timePlan,
    stimulus: { type: 'partner_turn', languageComponents: ['Hey! What time can we meet?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet', 'state_clock_time', 'ask_name'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['production.speak.state_clock_time', 'interaction.greet', 'interaction.ask_name'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["It's … o'clock", "What's your name?"], requiredVocabulary: ['time', 'name'], requiredConstructions: ['wh_question_name'] }
  }),
  /* #61 demand-routed support probe for identify_spoken_number: a
   * bare number inside a short utterance → pick what you heard. It
   * emits support_attempt events — remediation context that can never
   * mint milestones on either the substrate or the target cap. */
  task({
    id: 'task.time.support.number_probe',
    missionId: 'mission.meet_at_a_time',
    capabilityId: 'reception.listen.identify_spoken_number',
    modality: 'listening',
    purpose: 'support',
    promptFamily: pf('reception.listen.identify_spoken_number', TF.numberSpot),
    contextSignature: TF.numberSpot,
    stimulus: { type: 'audio_line', languageComponents: ['The lesson is at ten.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['identify_spoken_number'],
      options: [
        { id: 'ten', text: 'Lúc 10 giờ.', correct: true },
        { id: 'two', text: 'Lúc 2 giờ.' },
        { id: 'six', text: 'Lúc 6 giờ.' }
      ]
    },
    language: { requiredChunks: [], requiredVocabulary: ['ten', 'two', 'six'], requiredConstructions: [] }
  })
];

/* ── Fixture D — Complete a small order (R6 mission 4) ─────── */

const FOOD = {
  setting: 'food_stall',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'server',
  relationship: 'service'
};

const foodSig = (fields) => ({ ...FOOD, ...fields });

const OF = {
  greetCounter: foodSig({
    communicativeFunction: 'greet',
    cueTopology: 'counter_greeting',
    responseTopology: 'greeting_return',
    lexicalDomain: 'greetings'
  }),
  orderDialogue: foodSig({
    communicativeFunction: 'request_item',
    cueTopology: 'order_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'food_drink'
  }),
  menuQuestion: foodSig({
    communicativeFunction: 'request_item',
    cueTopology: 'menu_question',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  menuCued: foodSig({
    communicativeFunction: 'request_item',
    cueTopology: 'menu_cued_recall',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  orderPartner: foodSig({
    communicativeFunction: 'request_item',
    cueTopology: 'order_partner_exchange',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  choiceDialogue: foodSig({
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'choice_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'food_drink'
  }),
  choiceAsked: foodSig({
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'asked_choice',
    responseTopology: 'choice_answer',
    lexicalDomain: 'food_drink'
  }),
  choiceCued: foodSig({
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'choice_cued_recall',
    responseTopology: 'choice_answer',
    lexicalDomain: 'food_drink'
  }),
  choicePartner: foodSig({
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'choice_partner_exchange',
    responseTopology: 'choice_answer',
    lexicalDomain: 'food_drink'
  }),
  thanksCounter: foodSig({
    communicativeFunction: 'thank',
    cueTopology: 'service_close',
    responseTopology: 'politeness_return',
    lexicalDomain: 'greetings'
  }),
  /* R6 transfer signatures: a market-stall open request for
   * request_item; a forced A/B choice at a takeaway counter for
   * answer_simple_choice. */
  requestStall: {
    communicativeFunction: 'request_item',
    cueTopology: 'open_counter_request',
    setting: 'market_stall',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'vendor',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  },
  choiceTakeaway: {
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'forced_choice_offer',
    setting: 'takeaway_counter',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'counter_staff',
    relationship: 'service',
    responseTopology: 'choice_answer',
    lexicalDomain: 'food_drink'
  },
  orderCanteen: {
    communicativeFunction: 'answer_simple_choice',
    cueTopology: 'tray_line_exchange',
    setting: 'canteen',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'server',
    relationship: 'service',
    responseTopology: 'choice_answer',
    lexicalDomain: 'food_drink'
  },
  /* 008E: fresh assessment context for request_item — a drink-cart
   * vendor receiving the learner's order. The cue stays the practiced
   * service invitation; the held-out context is the learner-visible
   * cart/vendor situation, not novel cue vocabulary (008E R2). */
  requestCart: {
    communicativeFunction: 'request_item',
    cueTopology: 'cart_order_call',
    setting: 'drink_cart',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'vendor',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }
};

export const MISSION_COMPLETE_ORDER = makeMission({
  id: 'mission.complete_small_order',
  revision: 2,
  scenario: 'Order at a food stall and answer a choice question.',
  learnerGoal: 'Request an item and pick one option when the server offers a choice.',
  targetCapabilities: [
    'interaction.request_item',
    'interaction.answer_simple_choice'
  ],
  carrierCapabilities: ['interaction.greet', 'interaction.thank'],
  /* understand_simple_choice stays OFF the surface until the
   * support-demand router exists (R7) — choice comprehension is
   * embedded in the choice-answer interaction itself. */
  supportCapabilities: [],
  pedagogy: { recommendedAfterMissions: ['mission.meet_at_a_time'] },
  language: {
    assumedKnown: {
      chunks: ['What would you like?', 'Can I have …?', 'A coffee, please', 'A …, please', 'Hi', 'Hello'],
      vocabulary: ['coffee', 'please', 'tea', 'hi', 'hello'],
      constructions: []
    },
    introduced: {
      chunks: ['… or …?', 'The … one, please', 'A … one, please', 'Thank you', 'Thanks', '…, please'],
      vocabulary: ['or', 'small', 'large', 'thank', 'this', 'that', 'water', 'take', 'here'],
      constructions: []
    }
  },
  taskIds: [
    'task.order.diagnostic.request',
    'task.order.diagnostic.choice',
    'task.order.input.scene',
    'task.order.input.choice',
    'task.order.retrieval.request',
    'task.order.retrieval.choice',
    'task.order.retrieval.greet',
    'task.order.interaction.request_guided',
    'task.order.interaction.request_unaided',
    'task.order.interaction.choice_guided',
    'task.order.interaction.choice_unaided',
    'task.order.interaction.thanks',
    'task.order.delayed.request',
    'task.order.delayed.choice',
    'task.order.transfer.stall',
    'task.order.transfer.takeaway',
    'task.order.assessment.request',
    'task.order.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_COMPLETE_ORDER = [
  task({
    id: 'task.order.diagnostic.request',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.request_item', OF.menuQuestion),
    contextSignature: OF.menuQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A …, please', 'Can I have …?'], requiredVocabulary: ['please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.diagnostic.choice',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.answer_simple_choice', OF.choiceAsked),
    contextSignature: OF.choiceAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['Small or large?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    language: { requiredChunks: ['The … one, please'], requiredVocabulary: ['small', 'large'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.input.scene',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.greet', OF.greetCounter),
    contextSignature: OF.greetCounter,
    stimulus: { type: 'dialogue', languageComponents: ['Hello!', 'Hi! What can I get you?'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.input.choice',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.answer_simple_choice', OF.choiceDialogue),
    contextSignature: OF.choiceDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['Coffee or tea?', 'A tea, please.', 'Small or large?', 'A large one, please.'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['… or …?', 'A … one, please'], requiredVocabulary: ['or', 'small', 'large'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.retrieval.request',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.request_item', OF.menuCued),
    contextSignature: OF.menuCued,
    stimulus: { type: 'cued_prompt', languageComponents: ['A …, please'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A …, please', 'Can I have …?'], requiredVocabulary: ['coffee', 'tea'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.retrieval.choice',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.answer_simple_choice', OF.choiceCued),
    contextSignature: OF.choiceCued,
    stimulus: { type: 'cued_prompt', languageComponents: ['The … one, please'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    language: { requiredChunks: ['The … one, please', 'A … one, please'], requiredVocabulary: ['small', 'large'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.retrieval.greet',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.greet', OF.greetCounter),
    contextSignature: OF.greetCounter,
    stimulus: { type: 'partner_turn', languageComponents: ['Hello!'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet'] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.interaction.request_guided',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', OF.orderPartner),
    contextSignature: OF.orderPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.interaction.request_unaided',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', OF.orderPartner),
    contextSignature: OF.orderPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Anything to drink?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.interaction.choice_guided',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.answer_simple_choice', OF.choicePartner),
    contextSignature: OF.choicePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Coffee or tea?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.interaction.choice_unaided',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.answer_simple_choice', OF.choicePartner),
    contextSignature: OF.choicePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Small or large?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    language: { requiredChunks: ['A … one, please'], requiredVocabulary: ['small', 'large'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.interaction.thanks',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.thank',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.thank', OF.thanksCounter),
    contextSignature: OF.thanksCounter,
    stimulus: { type: 'partner_turn', languageComponents: ['Here you are.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['thank'] },
    language: { requiredChunks: ['Thank you', 'Thanks'], requiredVocabulary: ['thank'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.delayed.request',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.request_item', OF.orderPartner),
    contextSignature: OF.orderPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['And for you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.delayed.choice',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.answer_simple_choice', OF.choicePartner),
    contextSignature: OF.choicePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['This one or that one?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    language: { requiredChunks: ['A … one, please'], requiredVocabulary: ['this', 'that'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.transfer.stall',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.request_item', OF.requestStall),
    contextSignature: OF.requestStall,
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? What do you want?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'setting'] },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['water', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.transfer.takeaway',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.answer_simple_choice', OF.choiceTakeaway),
    contextSignature: OF.choiceTakeaway,
    stimulus: { type: 'partner_turn', languageComponents: ['Eat here or take away?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['…, please'], requiredVocabulary: ['take', 'here'], requiredConstructions: [] }
  }),
  /* 008E: direct fresh-assessment sample for request_item — the
   * capability was covered only transitively inside the choice-bound
   * checkpoint; this single-capability probe measures it post-transfer
   * in a context no teaching task rehearses. */
  task({
    id: 'task.order.assessment.request',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.request_item', OF.requestCart),
    contextSignature: OF.requestCart,
    /* 008E R2: the cue is the mission's rehearsed service invitation —
     * a request is the immediate pragmatic response, and a turn-taking-
     * only answer ("I'm next") is NOT evidence of request_item and must
     * score fail. Held-out novelty lives in the learner-visible drink-
     * cart situation, not in cue vocabulary. */
    stimulus: { type: 'partner_turn', languageComponents: ['What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.request_item'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['A …, please', 'Can I have …?'], requiredVocabulary: ['water', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.order.assessment.checkpoint',
    missionId: 'mission.complete_small_order',
    capabilityId: 'interaction.answer_simple_choice',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.answer_simple_choice', OF.orderCanteen),
    contextSignature: OF.orderCanteen,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi — noodles or rice? And a drink?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['answer_simple_choice', 'request_item', 'thank'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.answer_simple_choice', 'interaction.request_item', 'interaction.thank'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['A …, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  })
];

/* ── Fixture E — Buy a small item (R6 mission 5) ───────────── */

const SHOP = {
  setting: 'shop',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'clerk',
  relationship: 'service'
};

const shopSig = (fields) => ({ ...SHOP, ...fields });

const SF = {
  greetShop: shopSig({
    communicativeFunction: 'greet',
    cueTopology: 'shop_greeting',
    responseTopology: 'greeting_return',
    lexicalDomain: 'greetings'
  }),
  priceDialogue: shopSig({
    communicativeFunction: 'ask_price',
    cueTopology: 'price_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'shopping'
  }),
  priceAsked: shopSig({
    communicativeFunction: 'ask_price',
    cueTopology: 'item_price_query',
    responseTopology: 'price_question',
    lexicalDomain: 'shopping'
  }),
  priceCued: shopSig({
    communicativeFunction: 'ask_price',
    cueTopology: 'price_cued_recall',
    responseTopology: 'price_question',
    lexicalDomain: 'shopping'
  }),
  pricePartner: shopSig({
    communicativeFunction: 'ask_price',
    cueTopology: 'price_partner_exchange',
    responseTopology: 'price_question',
    lexicalDomain: 'shopping'
  }),
  priceQAudio: shopSig({
    communicativeFunction: 'understand_spoken_price',
    cueTopology: 'price_q_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'shopping'
  }),
  requestCounter: shopSig({
    communicativeFunction: 'request_item',
    cueTopology: 'shop_request',
    responseTopology: 'request',
    lexicalDomain: 'shopping'
  }),
  thanksShop: shopSig({
    communicativeFunction: 'thank',
    cueTopology: 'shop_close',
    responseTopology: 'politeness_return',
    lexicalDomain: 'greetings'
  }),
  /* R6 transfer signatures: a no-price-tag item at a street market for
   * ask_price; the cashier's total-due statement for
   * understand_spoken_price. */
  priceMarket: {
    communicativeFunction: 'ask_price',
    cueTopology: 'item_no_price_visible',
    setting: 'street_market',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'vendor',
    relationship: 'service',
    responseTopology: 'price_question',
    lexicalDomain: 'shopping'
  },
  priceCheckout: {
    communicativeFunction: 'understand_spoken_price',
    cueTopology: 'total_due_statement',
    setting: 'checkout',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'cashier',
    relationship: 'service',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'shopping'
  },
  priceKiosk: {
    communicativeFunction: 'understand_spoken_price',
    cueTopology: 'kiosk_price_statement',
    setting: 'kiosk',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'server',
    relationship: 'service',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'shopping'
  },
  priceBakery: {
    communicativeFunction: 'ask_price',
    cueTopology: 'counter_price_exchange',
    setting: 'bakery',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'baker',
    relationship: 'service',
    responseTopology: 'price_question',
    lexicalDomain: 'shopping'
  }
};

export const MISSION_BUY_ITEM = makeMission({
  id: 'mission.buy_small_item',
  revision: 2,
  scenario: 'Ask the price of a small item in a shop.',
  learnerGoal: 'Ask "How much is this?" and understand the answer.',
  targetCapabilities: [
    'interaction.ask_price',
    'reception.listen.understand_spoken_price'
  ],
  carrierCapabilities: ['interaction.request_item', 'interaction.thank'],
  supportCapabilities: [],
  pedagogy: { recommendedAfterMissions: ['mission.complete_small_order'] },
  language: {
    assumedKnown: {
      chunks: ['Can I have …?', 'A …, please', 'Thank you', 'Thanks'],
      vocabulary: ['please', 'thank', 'this', 'two', 'three', 'six', 'ten'],
      constructions: []
    },
    introduced: {
      chunks: ['How much is this?', 'How much is it?', "It's … dollars", '… dollars', 'This one, please', '… dollars, please'],
      vocabulary: ['much', 'dollar', 'five', 'eight'],
      constructions: []
    }
  },
  taskIds: [
    'task.price.diagnostic.ask',
    'task.price.diagnostic.hear',
    'task.price.input.scene',
    'task.price.input.amount',
    'task.price.retrieval.ask',
    /* Remediation precedes the re-drill it repairs: when refresh or
     * correction mints after an attributed miss, the first unconsumed
     * repair surface must be the remediation task, not the drill. */
    'task.price.remediation.hear',
    'task.price.retrieval.hear',
    'task.price.retrieval.request',
    'task.price.interaction.ask_guided',
    'task.price.interaction.ask_unaided',
    'task.price.interaction.thanks',
    'task.price.delayed.ask',
    'task.price.delayed.hear',
    'task.price.transfer.market',
    'task.price.transfer.checkout',
    'task.price.assessment.hear',
    'task.price.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_BUY_ITEM = [
  task({
    id: 'task.price.diagnostic.ask',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.ask_price', SF.priceAsked),
    contextSignature: SF.priceAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['Can I help you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    language: { requiredChunks: ['How much is this?'], requiredVocabulary: ['much', 'this'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.diagnostic.hear',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceQAudio),
    contextSignature: SF.priceQAudio,
    stimulus: { type: 'audio_line', languageComponents: ["It's two dollars."] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price'],
      options: [
        { id: 'two', text: '2 đô-la.', correct: true },
        { id: 'three', text: '3 đô-la.' },
        { id: 'twelve', text: '12 đô-la.' }
      ]
    },
    language: { requiredChunks: ["It's … dollars"], requiredVocabulary: ['two', 'dollar'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.input.scene',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.request_item', SF.priceDialogue),
    contextSignature: SF.priceDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['How much is this?', "It's two dollars.", 'This one, please.'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['How much is this?', "It's … dollars"], requiredVocabulary: ['much', 'dollar'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.input.amount',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceQAudio),
    contextSignature: SF.priceQAudio,
    stimulus: { type: 'dialogue', languageComponents: ['How much?', 'Three dollars, please.'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['… dollars'], requiredVocabulary: ['three', 'dollar'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.retrieval.ask',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.ask_price', SF.priceCued),
    contextSignature: SF.priceCued,
    stimulus: { type: 'cued_prompt', languageComponents: ['How much …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    language: { requiredChunks: ['How much is this?', 'How much is it?'], requiredVocabulary: ['much', 'this'], requiredConstructions: [] }
  }),
  /* 008E: the repair surface for spoken-price misses. The price frame is
   * stripped to a bare amount so the choice operationalizes exactly the
   * substrate a price comprehension needs — catching the number word —
   * while the response still names the attributed pair
   * (understand_spoken_price + identify_spoken_number). Deliberately
   * shares the practiced family: repair is not freshness evidence. */
  task({
    id: 'task.price.remediation.hear',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'remediation',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceQAudio),
    contextSignature: SF.priceQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Three dollars.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price', 'identify_spoken_number'],
      options: [
        { id: 'three', text: '3 đô-la.', correct: true },
        { id: 'thirteen', text: '13 đô-la.' },
        { id: 'eight', text: '8 đô-la.' }
      ]
    },
    language: { requiredChunks: ['… dollars'], requiredVocabulary: ['three'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.retrieval.hear',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceQAudio),
    contextSignature: SF.priceQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['That one is five dollars.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price'],
      options: [
        { id: 'five', text: '5 đô-la.', correct: true },
        { id: 'four', text: '4 đô-la.' },
        { id: 'fifteen', text: '15 đô-la.' }
      ]
    },
    language: { requiredChunks: ['… dollars'], requiredVocabulary: ['five', 'dollar'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.retrieval.request',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.request_item', SF.requestCounter),
    contextSignature: SF.requestCounter,
    stimulus: { type: 'partner_turn', languageComponents: ['Anything else?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['This one, please', 'A …, please'], requiredVocabulary: ['please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.interaction.ask_guided',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_price', SF.pricePartner),
    contextSignature: SF.pricePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Can I help you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['How much is this?'], requiredVocabulary: ['much', 'this'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.interaction.ask_unaided',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_price', SF.pricePartner),
    contextSignature: SF.pricePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Looking for something?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    language: { requiredChunks: ['How much is this?'], requiredVocabulary: ['much', 'this'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.interaction.thanks',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.thank',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.thank', SF.thanksShop),
    contextSignature: SF.thanksShop,
    stimulus: { type: 'partner_turn', languageComponents: ['Here you go — have a nice day.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['thank'] },
    language: { requiredChunks: ['Thank you', 'Thanks'], requiredVocabulary: ['thank'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.delayed.ask',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.ask_price', SF.pricePartner),
    contextSignature: SF.pricePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['You like that one?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    language: { requiredChunks: ['How much is this?'], requiredVocabulary: ['much', 'this'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.delayed.hear',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'delayed_retrieval',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceQAudio),
    contextSignature: SF.priceQAudio,
    stimulus: { type: 'audio_line', languageComponents: ['The total is ten dollars.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price'],
      options: [
        { id: 'ten', text: '10 đô-la.', correct: true },
        { id: 'two', text: '2 đô-la.' },
        { id: 'twenty', text: '20 đô-la.' }
      ]
    },
    language: { requiredChunks: ['… dollars'], requiredVocabulary: ['ten', 'dollar'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.transfer.market',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.ask_price', SF.priceMarket),
    contextSignature: SF.priceMarket,
    stimulus: { type: 'partner_turn', languageComponents: ['Nice hat, yes?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_price'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['How much is this?'], requiredVocabulary: ['much'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.transfer.checkout',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'transfer',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceCheckout),
    contextSignature: SF.priceCheckout,
    stimulus: { type: 'audio_line', languageComponents: ['That will be eight dollars.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price'],
      options: [
        { id: 'eight', text: '8 đô-la.', correct: true },
        { id: 'eighteen', text: '18 đô-la.' },
        { id: 'three', text: '3 đô-la.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['… dollars'], requiredVocabulary: ['eight'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.assessment.hear',
    missionId: 'mission.buy_small_item',
    capabilityId: 'reception.listen.understand_spoken_price',
    modality: 'listening',
    purpose: 'assessment',
    promptFamily: pf('reception.listen.understand_spoken_price', SF.priceKiosk),
    contextSignature: SF.priceKiosk,
    stimulus: { type: 'audio_line', languageComponents: ['Six dollars, please.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_spoken_price'],
      options: [
        { id: 'six', text: '6 đô-la.', correct: true },
        { id: 'sixteen', text: '16 đô-la.' },
        { id: 'seven', text: '7 đô-la.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['reception.listen.understand_spoken_price'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['… dollars, please'], requiredVocabulary: ['six'], requiredConstructions: [] }
  }),
  task({
    id: 'task.price.assessment.checkpoint',
    missionId: 'mission.buy_small_item',
    capabilityId: 'interaction.ask_price',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.ask_price', SF.priceBakery),
    contextSignature: SF.priceBakery,
    stimulus: { type: 'partner_turn', languageComponents: ['Morning! What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item', 'ask_price', 'thank'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.ask_price', 'interaction.request_item', 'interaction.thank'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['How much is this?', 'A …, please'], requiredVocabulary: ['much', 'please'], requiredConstructions: [] }
  })
];

/* ── Fixture F — Find a place (R6 mission 6) ───────────────── */

const STREET = {
  setting: 'street',
  register: 'neutral',
  channel: 'f2f',
  interlocutorRole: 'passerby',
  relationship: 'stranger_contact'
};

const streetSig = (fields) => ({ ...STREET, ...fields });

const LF = {
  greetStreet: streetSig({
    communicativeFunction: 'greet',
    cueTopology: 'street_greeting',
    responseTopology: 'greeting_return',
    lexicalDomain: 'greetings'
  }),
  directionDialogue: streetSig({
    communicativeFunction: 'follow_short_direction',
    cueTopology: 'route_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'directions'
  }),
  directionAudio: streetSig({
    communicativeFunction: 'follow_short_direction',
    cueTopology: 'route_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'directions'
  }),
  /* R7: a second practiced route topology — the generic capability
   * needs more than one-turn instructions in its practiced pool or the
   * held-out landmark transfer measures an un-practiced construct. */
  directionLandmark: streetSig({
    communicativeFunction: 'follow_short_direction',
    cueTopology: 'landmark_sequence',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'directions'
  }),
  placeAsked: streetSig({
    communicativeFunction: 'ask_location',
    cueTopology: 'place_query',
    responseTopology: 'location_question',
    lexicalDomain: 'places'
  }),
  placeCued: streetSig({
    communicativeFunction: 'ask_location',
    cueTopology: 'place_cued_recall',
    responseTopology: 'location_question',
    lexicalDomain: 'places'
  }),
  placePartner: streetSig({
    communicativeFunction: 'ask_location',
    cueTopology: 'place_partner_exchange',
    responseTopology: 'location_question',
    lexicalDomain: 'places'
  }),
  thanksStreet: streetSig({
    communicativeFunction: 'thank',
    cueTopology: 'street_close',
    responseTopology: 'politeness_return',
    lexicalDomain: 'greetings'
  }),
  /* R6 transfer signatures: asking staff inside a building for
   * ask_location; an employee's indoor landmark route for
   * follow_short_direction. */
  placeMall: {
    communicativeFunction: 'ask_location',
    cueTopology: 'locate_destination_inside_building',
    setting: 'shopping_center',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'staff',
    relationship: 'stranger_contact',
    responseTopology: 'location_question',
    lexicalDomain: 'places'
  },
  directionMall: {
    communicativeFunction: 'follow_short_direction',
    cueTopology: 'landmark_route_instruction',
    setting: 'shopping_center',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'staff',
    relationship: 'stranger_contact',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'directions'
  },
  directionStation: {
    communicativeFunction: 'follow_short_direction',
    cueTopology: 'platform_route_instruction',
    setting: 'station',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'staff',
    relationship: 'service',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'directions'
  },
  placeOffice: {
    communicativeFunction: 'ask_location',
    cueTopology: 'office_room_query',
    setting: 'office',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'receptionist',
    relationship: 'service',
    responseTopology: 'location_question',
    lexicalDomain: 'places'
  }
};

export const MISSION_FIND_PLACE = makeMission({
  id: 'mission.find_a_place',
  revision: 2,
  scenario: 'Ask a passer-by where a place is and follow the answer.',
  learnerGoal: 'Ask "Where is the …?" and follow a short direction.',
  targetCapabilities: [
    'interaction.ask_location',
    'reception.listen.follow_short_direction'
  ],
  carrierCapabilities: ['interaction.greet', 'interaction.thank'],
  /* identify_basic_direction_term stays OFF the surface until the
   * support-demand router exists (R7). */
  supportCapabilities: [],
  pedagogy: { recommendedAfterMissions: ['mission.buy_small_item'] },
  language: {
    assumedKnown: {
      chunks: ['Hi', 'Hello', 'Thank you', 'Thanks'],
      vocabulary: ['hi', 'hello', 'thank'],
      constructions: []
    },
    introduced: {
      chunks: ['Where is the …?', 'Turn left', 'Turn right', 'Go straight', 'On the left', 'On the right', 'Next to …', 'Straight ahead', 'Then …', 'Excuse me', 'Can I help you?'],
      vocabulary: ['where', 'left', 'right', 'straight', 'station', 'toilet', 'bank', 'lift', 'platform', 'excuse', 'help', 'café'],
      constructions: []
    }
  },
  taskIds: [
    'task.place.diagnostic.ask',
    'task.place.diagnostic.follow',
    'task.place.input.scene',
    'task.place.input.route',
    'task.place.retrieval.ask',
    /* Remediation precedes the re-drill it repairs (008E). */
    'task.place.remediation.follow',
    'task.place.retrieval.follow',
    'task.place.retrieval.follow_landmark',
    'task.place.retrieval.greet',
    'task.place.interaction.ask_guided',
    'task.place.interaction.ask_unaided',
    'task.place.interaction.thanks',
    'task.place.delayed.ask',
    'task.place.delayed.follow',
    'task.place.transfer.mall_ask',
    'task.place.transfer.mall_follow',
    'task.place.assessment.follow',
    'task.place.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_FIND_PLACE = [
  task({
    id: 'task.place.diagnostic.ask',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.ask_location', LF.placeAsked),
    contextSignature: LF.placeAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? Can I help you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'station'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.diagnostic.follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionAudio),
    contextSignature: LF.directionAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Turn left, then go straight.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'left_straight', text: 'Rẽ trái rồi đi thẳng.', correct: true },
        { id: 'right_straight', text: 'Rẽ phải rồi đi thẳng.' },
        { id: 'straight_left', text: 'Đi thẳng rồi rẽ trái.' }
      ]
    },
    language: { requiredChunks: ['Turn left', 'Go straight'], requiredVocabulary: ['left', 'straight'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.input.scene',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.greet', LF.greetStreet),
    contextSignature: LF.greetStreet,
    stimulus: { type: 'dialogue', languageComponents: ['Excuse me!', 'Yes? Can I help you?'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Excuse me', 'Can I help you?'], requiredVocabulary: ['excuse', 'help'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.input.route',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionDialogue),
    contextSignature: LF.directionDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['Where is the station?', 'Go straight, then turn right.', 'Thank you!'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Go straight', 'Turn right'], requiredVocabulary: ['straight', 'right', 'station'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.retrieval.ask',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.ask_location', LF.placeCued),
    contextSignature: LF.placeCued,
    stimulus: { type: 'cued_prompt', languageComponents: ['Where is the …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'station', 'toilet'], requiredConstructions: [] }
  }),
  /* 008E: the repair surface for direction misses. A single isolated
   * imperative makes the choice operationalize the substrate a direction
   * needs — catching the direction term (identify_basic_direction_term) —
   * a different substrate from price comprehension's number-catch. Shares
   * the practiced family deliberately: repair is not freshness evidence. */
  task({
    id: 'task.place.remediation.follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'remediation',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionAudio),
    contextSignature: LF.directionAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Turn right.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction', 'identify_basic_direction_term'],
      options: [
        { id: 'right', text: 'Rẽ phải.', correct: true },
        { id: 'left', text: 'Rẽ trái.' },
        { id: 'straight', text: 'Đi thẳng.' }
      ]
    },
    language: { requiredChunks: ['Turn right'], requiredVocabulary: ['right'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.retrieval.follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionAudio),
    contextSignature: LF.directionAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Turn right at the bank.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'right_bank', text: 'Rẽ phải ở ngân hàng.', correct: true },
        { id: 'left_bank', text: 'Rẽ trái ở ngân hàng.' },
        { id: 'past_bank', text: 'Đi qua ngân hàng.' }
      ]
    },
    language: { requiredChunks: ['Turn right'], requiredVocabulary: ['right', 'bank'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.retrieval.follow_landmark',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionLandmark),
    contextSignature: LF.directionLandmark,
    stimulus: { type: 'audio_line', languageComponents: ['Go past the café — the bank is next to it.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'bank_after_cafe', text: 'Đi qua quán cà phê — ngân hàng ở cạnh đó.', correct: true },
        { id: 'cafe_after_bank', text: 'Đi qua ngân hàng — quán cà phê ở cạnh đó.' },
        { id: 'turn_cafe', text: 'Rẽ ở quán cà phê.' }
      ]
    },
    language: { requiredChunks: ['Next to …'], requiredVocabulary: ['bank', 'café'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.retrieval.greet',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.greet', LF.greetStreet),
    contextSignature: LF.greetStreet,
    stimulus: { type: 'partner_turn', languageComponents: ['Hello!'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet'] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.interaction.ask_guided',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_location', LF.placePartner),
    contextSignature: LF.placePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Can I help you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'station'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.interaction.ask_unaided',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_location', LF.placePartner),
    contextSignature: LF.placePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Sorry, what are you looking for?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'toilet'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.interaction.thanks',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.thank',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.thank', LF.thanksStreet),
    contextSignature: LF.thanksStreet,
    stimulus: { type: 'partner_turn', languageComponents: ["It's just over there."] },
    response: { type: 'spoken_turn', requiredFunctions: ['thank'] },
    language: { requiredChunks: ['Thank you', 'Thanks'], requiredVocabulary: ['thank'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.delayed.ask',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.ask_location', LF.placePartner),
    contextSignature: LF.placePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['You need something?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'bank'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.delayed.follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'delayed_retrieval',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionAudio),
    contextSignature: LF.directionAudio,
    stimulus: { type: 'audio_line', languageComponents: ['Go straight, then it is on the left.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'straight_left', text: 'Đi thẳng, nó ở bên trái.', correct: true },
        { id: 'straight_right', text: 'Đi thẳng, nó ở bên phải.' },
        { id: 'left_straight', text: 'Rẽ trái rồi đi thẳng.' }
      ]
    },
    language: { requiredChunks: ['Go straight', 'On the left'], requiredVocabulary: ['straight', 'left'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.transfer.mall_ask',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.ask_location', LF.placeMall),
    contextSignature: LF.placeMall,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi — looking for something?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_location'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['Where is the …?'], requiredVocabulary: ['where', 'toilet'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.transfer.mall_follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'transfer',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionMall),
    contextSignature: LF.directionMall,
    stimulus: { type: 'audio_line', languageComponents: ['It is next to the lift, on the right.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'lift_right', text: 'Cạnh thang máy, bên phải.', correct: true },
        { id: 'lift_left', text: 'Cạnh thang máy, bên trái.' },
        { id: 'stairs', text: 'Cạnh cầu thang.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['On the right', 'Next to …'], requiredVocabulary: ['right', 'lift'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.assessment.follow',
    missionId: 'mission.find_a_place',
    capabilityId: 'reception.listen.follow_short_direction',
    modality: 'listening',
    purpose: 'assessment',
    promptFamily: pf('reception.listen.follow_short_direction', LF.directionStation),
    contextSignature: LF.directionStation,
    stimulus: { type: 'audio_line', languageComponents: ['Platform two — straight ahead, then left.'] },
    response: {
      type: 'choice',
      requiredFunctions: ['follow_short_direction'],
      options: [
        { id: 'ahead_left', text: 'Đi thẳng rồi rẽ trái.', correct: true },
        { id: 'ahead_right', text: 'Đi thẳng rồi rẽ phải.' },
        { id: 'left_ahead', text: 'Rẽ trái ngay đây.' }
      ]
    },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['reception.listen.follow_short_direction'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['Straight ahead', 'Then …'], requiredVocabulary: ['left', 'platform'], requiredConstructions: [] }
  }),
  task({
    id: 'task.place.assessment.checkpoint',
    missionId: 'mission.find_a_place',
    capabilityId: 'interaction.ask_location',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.ask_location', LF.placeOffice),
    contextSignature: LF.placeOffice,
    stimulus: { type: 'partner_turn', languageComponents: ['Good morning — what can I do for you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet', 'ask_location', 'thank'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.ask_location', 'interaction.greet', 'interaction.thank'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['Where is the …?', 'Thank you'], requiredVocabulary: ['where', 'thank'], requiredConstructions: [] }
  })
];

/* ── Fixture G — Talk about yourself and family (R6 mission 7) ─ */

const SOCIAL = {
  setting: 'personal',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'new_peer',
  relationship: 'repeat_contact'
};

const socialSig = (fields) => ({ ...SOCIAL, ...fields });

const MF = {
  nameSocial: socialSig({
    communicativeFunction: 'state_own_name',
    cueTopology: 'reintroduction',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }),
  selfDialogue: socialSig({
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'small_talk_detail',
    responseTopology: 'none',
    lexicalDomain: 'identity'
  }),
  selfAsked: socialSig({
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'asked_self_detail',
    responseTopology: 'self_detail_statement',
    lexicalDomain: 'identity'
  }),
  selfCued: socialSig({
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'self_cued_recall',
    responseTopology: 'self_detail_statement',
    lexicalDomain: 'identity'
  }),
  selfPartner: socialSig({
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'small_talk_exchange',
    responseTopology: 'self_detail_statement',
    lexicalDomain: 'identity'
  }),
  familyDialogue: socialSig({
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'family_dialogue',
    responseTopology: 'none',
    lexicalDomain: 'family'
  }),
  familyAsked: socialSig({
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'asked_about_family',
    responseTopology: 'description_statement',
    lexicalDomain: 'family'
  }),
  familyCued: socialSig({
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'family_cued_recall',
    responseTopology: 'description_statement',
    lexicalDomain: 'family'
  }),
  familyPartner: socialSig({
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'photo_talk_exchange',
    responseTopology: 'description_statement',
    lexicalDomain: 'family'
  }),
  /* R6 transfer signatures: an admin asks a personal detail for
   * state_basic_self_detail; identifying/describing a person from
   * context for describe_family_member_basic. */
  selfOffice: {
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'registration_detail',
    setting: 'office',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'admin_staff',
    relationship: 'repeat_contact',
    responseTopology: 'self_detail_statement',
    lexicalDomain: 'identity'
  },
  familyIntroduce: {
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'identify_person_in_context',
    setting: 'community',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'acquaintance',
    relationship: 'repeat_contact',
    responseTopology: 'description_statement',
    lexicalDomain: 'family'
  },
  selfNeighbor: {
    communicativeFunction: 'describe_family_member_basic',
    cueTopology: 'neighbor_family_talk',
    setting: 'neighborhood',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'neighbor',
    relationship: 'repeat_contact',
    responseTopology: 'description_statement',
    lexicalDomain: 'family'
  },
  /* 008E: fresh assessment context for state_basic_self_detail — a
   * homestay host's arrival question. Not the rehearsed peer small-talk
   * exchange and not the office registration form: different cue
   * topology, setting and partner. */
  selfHost: {
    communicativeFunction: 'state_basic_self_detail',
    cueTopology: 'host_arrival_detail',
    setting: 'homestay',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'host',
    relationship: 'first_meeting',
    responseTopology: 'self_detail_statement',
    lexicalDomain: 'identity'
  }
};

export const MISSION_SELF_FAMILY = makeMission({
  id: 'mission.talk_about_self_family',
  revision: 2,
  scenario: 'Tell a new acquaintance where you are from and describe a family member.',
  learnerGoal: 'State one personal detail and describe one family member in simple phrases.',
  targetCapabilities: [
    'production.speak.state_basic_self_detail',
    'production.speak.describe_family_member_basic'
  ],
  carrierCapabilities: ['production.speak.say_own_name'],
  /* R6: lexical support only — no spoken support capability declared. */
  supportCapabilities: [],
  pedagogy: { recommendedAfterMissions: ['mission.find_a_place'] },
  language: {
    assumedKnown: {
      chunks: ["I'm …", 'My name is …'],
      vocabulary: ['name'],
      constructions: []
    },
    introduced: {
      chunks: ["I'm from …", 'I live in …', 'This is my …', 'My … is …', "She's …", "He's …", 'I work in …', 'I study at …', 'I have a …'],
      vocabulary: ['from', 'live', 'family', 'mother', 'father', 'sister', 'brother', 'teacher', 'work', 'study'],
      constructions: []
    }
  },
  taskIds: [
    'task.self.diagnostic.detail',
    'task.self.diagnostic.family',
    'task.self.input.scene',
    'task.self.input.family',
    'task.self.retrieval.detail',
    'task.self.retrieval.family',
    'task.self.retrieval.name',
    'task.self.interaction.detail_guided',
    'task.self.interaction.detail_unaided',
    'task.self.interaction.family_guided',
    'task.self.interaction.family_unaided',
    'task.self.delayed.detail',
    'task.self.delayed.family',
    'task.self.transfer.office',
    'task.self.transfer.introduce',
    'task.self.assessment.detail',
    'task.self.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_SELF_FAMILY = [
  task({
    id: 'task.self.diagnostic.detail',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfAsked),
    contextSignature: MF.selfAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['Where are you from?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    language: { requiredChunks: ["I'm from …"], requiredVocabulary: ['from'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.diagnostic.family',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyAsked),
    contextSignature: MF.familyAsked,
    stimulus: { type: 'partner_turn', languageComponents: ['Tell me about your family.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    language: { requiredChunks: ['My … is …'], requiredVocabulary: ['family', 'mother', 'father'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.input.scene',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'input',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfDialogue),
    contextSignature: MF.selfDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['Where are you from?', "I'm from Vietnam.", 'Oh nice — I live in Hanoi.', 'I live in Hanoi too!'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["I'm from …", 'I live in …'], requiredVocabulary: ['from', 'live'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.input.family',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'input',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyDialogue),
    contextSignature: MF.familyDialogue,
    stimulus: { type: 'dialogue', languageComponents: ['This is my mother.', "She's a teacher.", "And my brother — he's a student."] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['This is my …', "She's …", "He's …"], requiredVocabulary: ['mother', 'brother', 'teacher'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.retrieval.detail',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfCued),
    contextSignature: MF.selfCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["I'm from …"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    language: { requiredChunks: ["I'm from …", 'I live in …'], requiredVocabulary: ['from', 'live'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.retrieval.family',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyCued),
    contextSignature: MF.familyCued,
    stimulus: { type: 'cued_prompt', languageComponents: ['This is my …'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    language: { requiredChunks: ['This is my …', "She's …"], requiredVocabulary: ['mother', 'sister'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.retrieval.name',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.say_own_name', MF.nameSocial),
    contextSignature: MF.nameSocial,
    stimulus: { type: 'partner_turn', languageComponents: ['Sorry, what was your name again?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.interaction.detail_guided',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfPartner),
    contextSignature: MF.selfPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Where do you live?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['I live in …', "I'm from …"], requiredVocabulary: ['live', 'from'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.interaction.detail_unaided',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfPartner),
    contextSignature: MF.selfPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['And what do you do?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    language: { requiredChunks: ['I work in …', 'I study at …'], requiredVocabulary: ['work', 'study'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.interaction.family_guided',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyPartner),
    contextSignature: MF.familyPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Who is this in the photo?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['This is my …'], requiredVocabulary: ['mother', 'father'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.interaction.family_unaided',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'interaction',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyPartner),
    contextSignature: MF.familyPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Do you have any sisters or brothers?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    language: { requiredChunks: ['My … is …', 'I have a …'], requiredVocabulary: ['sister', 'brother'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.delayed.detail',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'delayed_retrieval',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfPartner),
    contextSignature: MF.selfPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['So — where are you from again?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    language: { requiredChunks: ["I'm from …"], requiredVocabulary: ['from'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.delayed.family',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'delayed_retrieval',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyPartner),
    contextSignature: MF.familyPartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Remind me — what does your mother do?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    language: { requiredChunks: ['My … is …', "She's …"], requiredVocabulary: ['mother', 'teacher'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.transfer.office',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'transfer',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfOffice),
    contextSignature: MF.selfOffice,
    stimulus: { type: 'partner_turn', languageComponents: ['For the form — your city, please?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ["I'm from …", 'I live in …'], requiredVocabulary: ['from', 'live'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.transfer.introduce',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'transfer',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.familyIntroduce),
    contextSignature: MF.familyIntroduce,
    stimulus: { type: 'partner_turn', languageComponents: ['Who is that with you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['describe_family_member_basic'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['This is my …', "She's …"], requiredVocabulary: ['sister', 'family'], requiredConstructions: [] }
  }),
  /* 008E: direct fresh-assessment sample for state_basic_self_detail —
   * the capability was covered only transitively inside the
   * family-bound checkpoint; this single-capability probe measures it
   * post-transfer in a context no teaching task rehearses. */
  task({
    id: 'task.self.assessment.detail',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.state_basic_self_detail',
    modality: 'spoken_production',
    purpose: 'assessment',
    promptFamily: pf('production.speak.state_basic_self_detail', MF.selfHost),
    contextSignature: MF.selfHost,
    /* The cue is the host's direct personal-detail question — the same
     * pragmatic move the mission already practices ("Where are you
     * from?"), so every invited answer ("I'm from Vietnam") is inside
     * the deterministic matcher's accepted forms (008E R1). */
    stimulus: { type: 'partner_turn', languageComponents: ['And where are you from?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_basic_self_detail'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['production.speak.state_basic_self_detail'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    /* 008E R2: metadata must declare the response construct this cue
     * actually invites — the from-detail family — not the work/study
     * surface the removed work/student prompt belonged to. */
    language: { requiredChunks: ["I'm from …"], requiredVocabulary: ['from'], requiredConstructions: [] }
  }),
  task({
    id: 'task.self.assessment.checkpoint',
    missionId: 'mission.talk_about_self_family',
    capabilityId: 'production.speak.describe_family_member_basic',
    modality: 'spoken_production',
    purpose: 'assessment',
    promptFamily: pf('production.speak.describe_family_member_basic', MF.selfNeighbor),
    contextSignature: MF.selfNeighbor,
    stimulus: { type: 'partner_turn', languageComponents: ["I don't think we've met — tell me about you and your family!"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name', 'state_basic_self_detail', 'describe_family_member_basic'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['production.speak.describe_family_member_basic', 'production.speak.state_basic_self_detail', 'production.speak.say_own_name'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["I'm …", "I'm from …", 'My … is …'], requiredVocabulary: ['name', 'from', 'family'], requiredConstructions: [] }
  })
];

export const FIXTURES = [
  { mission: MISSION_MEET_PERSON, tasks: TASKS_MEET_PERSON },
  { mission: MISSION_ORDER_DRINK, tasks: TASKS_ORDER_DRINK },
  { mission: MISSION_MEET_AT_TIME, tasks: TASKS_MEET_AT_TIME },
  { mission: MISSION_COMPLETE_ORDER, tasks: TASKS_COMPLETE_ORDER },
  { mission: MISSION_BUY_ITEM, tasks: TASKS_BUY_ITEM },
  { mission: MISSION_FIND_PLACE, tasks: TASKS_FIND_PLACE },
  { mission: MISSION_SELF_FAMILY, tasks: TASKS_SELF_FAMILY }
];

export { capabilityById };
