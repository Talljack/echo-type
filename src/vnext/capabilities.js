/*
 * vNext capability graph v0 (issue #42, docs/vnext/capability-model-v0.md).
 *
 * A capability is an observable ability under stated conditions — not a
 * lesson position. Prerequisites gate introduction; evidence requirements
 * gate claims. Vietnamese risk probes reference risk-priors.js and may
 * only trigger diagnostics, never mark weakness.
 */

export const MODALITIES = [
  'listening',
  'spoken_interaction',
  'spoken_production',
  'reading',
  'writing'
];

const cap = (c) => ({
  version: 1,
  conditions: { partnerCooperative: true, topicFamiliar: true, speechRate: 'slow_clear', supportAllowed: [] },
  prerequisites: [],
  language: { chunks: [], constructions: [], vocabulary: [] },
  evidence: { independentRequired: true, delayedRequired: true, transferRequired: true },
  vietnameseRiskProbes: [],
  ...c
});

/* Capability ids are namespaced by CEFR activity type (R5):
 *   reception.listen.* / reception.read.*   — reception
 *   production.speak.* / production.write.* — production
 *   interaction.*                            — interaction
 * Prerequisites exist ONLY where a downstream capability genuinely
 * depends on the upstream one — never a blanket "all reception before
 * all production" ordering. R7 review sharpened the bar: a hard edge is
 * legitimate only when NO valid assessment exists that a learner could
 * pass on the downstream capability while still failing the upstream
 * one (e.g. lexical comprehension gating a recall capability). Sequencing
 * ("learn greetings before introductions") is pedagogy — it lives in
 * mission `pedagogy.recommendedAfterMissions`, NOT in this DAG. Every
 * capability below currently declares an empty array on purpose.
 *
 * `providesFunctions` marks demand-driven support substrate: the cap is
 * never routed on its own, but when a target task's evaluation reports
 * `missingFunctions` that its list covers, the support-demand mechanism
 * (follow-up issue) may mint a probe task for it.
 */
export const CAPABILITIES = [
  cap({
    id: 'reception.listen.greeting_basic',
    performance: 'Understand a basic greeting said to them.',
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['recognize_greeting'] },
    language: { chunks: ['Hi', 'Hello', 'Good morning'], vocabulary: ['hi', 'hello', 'morning'] },
    vietnameseRiskProbes: ['vn.english_intonation']
  }),
  cap({
    id: 'reception.listen.identity_question_basic',
    performance: "Understand a simple identity question ('What's your name?', 'Where are you from?').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_identity_question'] },
    language: { chunks: ["What's your name?", 'Where are you from?'], constructions: ['wh_question_name'], vocabulary: ['name', 'from'] },
    vietnameseRiskProbes: ['vn.theta_eth', 'vn.english_intonation']
  }),
  cap({
    id: 'reception.listen.drink_order_question_basic',
    performance: "Understand a basic drink-order question ('What would you like?').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_offer_or_order_question'] },
    language: { chunks: ['What would you like?', 'Anything else?'], vocabulary: ['like', 'drink'] },
    vietnameseRiskProbes: ['vn.english_intonation']
  }),
  cap({
    id: 'production.speak.say_own_name',
    performance: 'Say their own name intelligibly when asked.',
    modality: 'spoken_production',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['state_own_name'] },
    language: { chunks: ["I'm …", 'My name is …'], vocabulary: ['name'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.lexical_stress']
  }),
  cap({
    id: 'interaction.greet',
    performance: 'Return a greeting in a short first-meeting exchange.',
    modality: 'spoken_interaction',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['greet'] },
    language: { chunks: ['Hi', 'Hello'], vocabulary: ['hi', 'hello'] },
    vietnameseRiskProbes: ['vn.lexical_stress', 'vn.speaking_anxiety_support']
  }),
  cap({
    id: 'interaction.ask_name',
    performance: "Ask another person's name in a short first-meeting exchange.",
    modality: 'spoken_interaction',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_name'] },
    language: { chunks: ["What's your name?"], constructions: ['wh_question_name'], vocabulary: ['name'] },
    vietnameseRiskProbes: ['vn.question_formation', 'vn.lexical_stress']
  }),
  cap({
    id: 'interaction.respond_to_introduction',
    performance: "Respond politely to an introduction ('Nice to meet you').",
    modality: 'spoken_interaction',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['respond_to_introduction'] },
    language: { chunks: ['Nice to meet you', 'Nice to meet you too'], vocabulary: ['nice', 'meet'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.theta_eth']
  }),
  cap({
    id: 'interaction.ask_repeat',
    performance: 'Ask a partner to repeat when they did not catch something.',
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_repeat'] },
    language: { chunks: ['Sorry?', 'Can you repeat that?', 'Again, please'], vocabulary: ['sorry', 'repeat', 'again'] },
    vietnameseRiskProbes: ['vn.speaking_anxiety_support', 'vn.inflectional_endings']
  }),
  cap({
    id: 'interaction.signal_nonunderstanding',
    performance: "Signal that they did not understand ('I don't understand').",
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['signal_nonunderstanding'] },
    language: { chunks: ["I don't understand", "Sorry, I don't know"], constructions: ['negative_aux'], vocabulary: ['understand'] },
    vietnameseRiskProbes: ['vn.speaking_anxiety_support', 'vn.consonant_clusters']
  }),
  cap({
    id: 'interaction.request_item',
    performance: 'Request an item politely in a service exchange (drink, food, small goods).',
    modality: 'spoken_interaction',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['request_item'] },
    language: { chunks: ['Can I have …?', 'A coffee, please'], vocabulary: ['coffee', 'tea', 'please'] },
    vietnameseRiskProbes: ['vn.inflectional_endings', 'vn.lexical_stress']
  }),
  /* ── M3–M7 additions (R6). Substrate caps carry NO DAG edges —
   * number/direction-term recognition is support material the planner
   * may probe on demand, not a hard gate: CEFR A1 never requires
   * general number mastery before time/price activities. Interaction
   * targets edge only to the reception capability that genuinely
   * constrains them. ─────────────────────────────────────────────── */
  cap({
    id: 'reception.listen.identify_spoken_number',
    providesFunctions: ['identify_spoken_number'],
    performance: 'Catch a spoken number word (one–twenty) inside a short utterance.',
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['identify_spoken_number'] },
    language: { vocabulary: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] },
    vietnameseRiskProbes: ['vn.english_intonation', 'vn.consonant_clusters']
  }),
  cap({
    id: 'reception.listen.understand_clock_time',
    performance: "Understand a stated clock time ('It's three o'clock', 'at half past two').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_clock_time'] },
    language: { chunks: ["It's … o'clock", 'at …', 'half past …'], vocabulary: ['time', 'clock'] },
    vietnameseRiskProbes: ['vn.theta_eth', 'vn.english_intonation']
  }),
  cap({
    id: 'production.speak.state_clock_time',
    performance: "Say a clock time when asked ('It's two o'clock').",
    modality: 'spoken_production',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['state_clock_time'] },
    language: { chunks: ["It's … o'clock", 'half past …', 'at …'], vocabulary: ['time', 'clock'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.lexical_stress']
  }),
  cap({
    id: 'reception.listen.understand_simple_choice',
    providesFunctions: ['understand_simple_choice'],
    performance: "Understand a spoken either/or offer ('Small or large?').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_simple_choice'] },
    language: { chunks: ['… or …?'], vocabulary: ['or', 'small', 'large', 'this', 'that'] },
    vietnameseRiskProbes: ['vn.english_intonation', 'vn.consonant_clusters']
  }),
  cap({
    id: 'interaction.answer_simple_choice',
    performance: 'Pick one option from a spoken either/or offer.',
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['answer_simple_choice'] },
    language: { chunks: ['The … one, please', 'A … one, please', '…, please'], vocabulary: ['small', 'large', 'please'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.lexical_stress']
  }),
  cap({
    id: 'interaction.thank',
    performance: "Thank a partner politely in a service exchange ('Thank you', 'Thanks').",
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['thank'] },
    language: { chunks: ['Thank you', 'Thanks'], vocabulary: ['thank'] },
    vietnameseRiskProbes: ['vn.theta_eth', 'vn.speaking_anxiety_support']
  }),
  cap({
    id: 'interaction.ask_price',
    performance: "Ask the price of an item ('How much is this?').",
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_price'] },
    language: { chunks: ['How much is this?', 'How much is it?'], vocabulary: ['much', 'this', 'price'] },
    vietnameseRiskProbes: ['vn.question_formation', 'vn.word_final_consonants']
  }),
  cap({
    id: 'reception.listen.understand_spoken_price',
    performance: "Understand a stated price ('Two dollars', 'Five fifty').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_spoken_price'] },
    language: { chunks: ["It's …", '… dollars', '…, please'], vocabulary: ['dollar', 'fifty'] },
    vietnameseRiskProbes: ['vn.english_intonation', 'vn.theta_eth']
  }),
  cap({
    id: 'interaction.ask_location',
    performance: "Ask where a place is ('Where is the station?').",
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_location'] },
    language: { chunks: ['Where is the …?', 'Where is …?'], vocabulary: ['where', 'station', 'toilet', 'bank'] },
    vietnameseRiskProbes: ['vn.question_formation', 'vn.lexical_stress']
  }),
  cap({
    id: 'reception.listen.follow_short_direction',
    performance: 'Follow a short spoken direction (turn left, go straight, on the right).',
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['follow_short_direction'] },
    language: { chunks: ['Turn left', 'Go straight', 'On the right', 'Next to …'], vocabulary: ['left', 'right', 'straight'] },
    vietnameseRiskProbes: ['vn.consonant_clusters', 'vn.word_final_consonants']
  }),
  cap({
    id: 'reception.listen.identify_basic_direction_term',
    providesFunctions: ['identify_basic_direction_term'],
    performance: 'Catch a basic direction term (left, right, straight) inside an utterance.',
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['identify_basic_direction_term'] },
    language: { vocabulary: ['left', 'right', 'straight', 'turn'] },
    vietnameseRiskProbes: ['vn.consonant_clusters']
  }),
  cap({
    id: 'production.speak.state_basic_self_detail',
    performance: "State one basic personal detail when asked ('I'm from Vietnam', 'I live in Hanoi').",
    modality: 'spoken_production',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['state_basic_self_detail'] },
    language: { chunks: ["I'm from …", 'I live in …', 'I work in …'], vocabulary: ['from', 'live', 'work'] },
    vietnameseRiskProbes: ['vn.copula_be', 'vn.lexical_stress']
  }),
  cap({
    id: 'production.speak.describe_family_member_basic',
    performance: "Describe a family member in one or two simple phrases ('This is my mother. She's a teacher.').",
    modality: 'spoken_production',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['describe_family_member_basic'] },
    language: { chunks: ['This is my …', 'My … is …', "She's …", "He's …"], vocabulary: ['mother', 'father', 'sister', 'brother', 'family'] },
    vietnameseRiskProbes: ['vn.theta_eth', 'vn.inflectional_endings']
  }),
  cap({
    id: 'reception.read.simple_sign_or_menu_item',
    performance: 'Read a very simple sign or menu item (EXIT, OPEN, coffee, tea).',
    modality: 'reading',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['read_sign_item'] },
    language: { vocabulary: ['open', 'closed', 'coffee', 'tea', 'exit'] }
  }),
  cap({
    id: 'production.write.personal_info_short',
    performance: 'Write one short personal-information response (name, country).',
    modality: 'writing',
    prerequisites: [],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['write_identity_response'] },
    language: { chunks: ["I'm …", "I'm from …"], vocabulary: ['name', 'from'] },
    vietnameseRiskProbes: ['vn.copula_be', 'vn.articles']
  })
];

const INDEX = new Map(CAPABILITIES.map((c) => [c.id, c]));

export function capabilityById(id) {
  const c = INDEX.get(id);
  if (!c) throw new Error(`Unknown capability: ${id}`);
  return c;
}

/* Structural validation: unique ids, known modalities, existing
 * prerequisites, acyclic graph. Called by tests and content tooling —
 * the graph is authored data and must stay honest. */
export function validateGraph(capabilities) {
  const problems = [];
  const ids = new Set();
  for (const c of capabilities) {
    if (!c.id || typeof c.id !== 'string') problems.push('capability missing id');
    if (ids.has(c.id)) problems.push(`duplicate capability id: ${c.id}`);
    ids.add(c.id);
    if (!MODALITIES.includes(c.modality)) problems.push(`${c.id}: unknown modality ${c.modality}`);
    for (const p of c.prerequisites || []) {
      if (!capabilities.some((x) => x.id === p)) problems.push(`${c.id}: unknown prerequisite ${p}`);
    }
  }
  const local = new Map(capabilities.map((c) => [c.id, c]));
  const color = new Map();
  const visit = (id, path) => {
    if (color.get(id) === 'done') return;
    if (color.get(id) === 'open') {
      problems.push(`prerequisite cycle: ${[...path, id].join(' → ')}`);
      return;
    }
    color.set(id, 'open');
    for (const p of local.get(id)?.prerequisites || []) visit(p, [...path, id]);
    color.set(id, 'done');
  };
  for (const c of capabilities) visit(c.id, []);
  return problems;
}
