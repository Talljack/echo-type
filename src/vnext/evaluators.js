/*
 * vNext deterministic evaluator registry (issue #55, research R4 on #49).
 *
 * `evaluation.contractId` names a scoring SPEC, not a task. The registry
 * maps each declared contract id to the deterministic scorer that may
 * produce an outcome under it. Two contracts exist in v0:
 *
 *   eval.required_functions.v1
 *     For free-response tasks. Every declared
 *     task.response.requiredFunctions must be evidenced by a structured
 *     phrase match (mission-checks canonical form — word boundaries,
 *     contraction expansion, Vietnamese diacritic folding). Outcome:
 *     all functions matched → 'success', some → 'partial', none → 'fail'.
 *
 *   eval.choice.correct.v1
 *     For response.type 'choice'. The learner submits an option id;
 *     success iff that option is flagged correct in task.response.options.
 *
 * Unknown contract ids score NOTHING — an evaluator the engine cannot
 * name must never mint an outcome (fail closed).
 */
import { meetsCheck } from '../core/mission-checks.js';

export const EVALUATOR_VERSION = 1;

/* Communicative-function matchers. Each lists surface patterns matched
 * on word boundaries after canonicalisation; '<name>' resolves to the
 * learner's own name captured for the run. Strict by design — 'and you?'
 * alone is NOT asking a name, 'your namesake' is not 'your name'. */
const FUNCTION_MATCHERS = {
  greet: {
    match: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
  },
  ask_name: {
    match: [
      'what is your name',
      'your name please',
      'may i know your name',
      'can i know your name',
      'may i have your name',
      'can i have your name',
      'tell me your name'
    ]
  },
  state_own_name: {
    match: ['i am <name>', 'my name is <name>', 'call me <name>', '<name>', 'im <name>']
  },
  ask_repeat: {
    match: [
      'sorry',
      'can you repeat that',
      'can you repeat',
      'could you repeat that',
      'repeat please',
      'say again',
      'again please',
      'one more time'
    ]
  },
  respond_to_introduction: {
    match: ['nice to meet you too', 'nice to meet you', 'you too', 'likewise']
  },
  signal_nonunderstanding: {
    match: ['i do not understand', 'i do not know', 'sorry i do not know', 'i do not get it']
  },
  request_item: {
    match: [
      'a coffee please',
      'a tea please',
      'coffee please',
      'tea please',
      'one coffee please',
      'one tea please',
      'a sandwich please',
      'some water please',
      'a sandwich',
      'some water',
      'this one please',
      'that one please',
      'can i have a coffee',
      'can i have a tea',
      'can i have coffee',
      'can i have tea',
      'can i have this',
      'can i have a sandwich',
      'could i have a coffee',
      'could i have a tea',
      'i would like a coffee',
      'i would like a tea',
      'i would like this',
      'i d like a coffee',
      'i d like a tea'
    ]
  },
  state_clock_time: {
    match: [
      'it is one o clock', 'it is two o clock', 'it is three o clock', 'it is four o clock',
      'it is five o clock', 'it is six o clock', 'it is seven o clock', 'it is eight o clock',
      'it is nine o clock', 'it is ten o clock', 'it is eleven o clock', 'it is twelve o clock',
      'it s one o clock', 'it s two o clock', 'it s three o clock', 'it s four o clock',
      'it s five o clock', 'it s six o clock', 'it s seven o clock', 'it s eight o clock',
      'it s nine o clock', 'it s ten o clock', 'it s eleven o clock', 'it s twelve o clock',
      'one o clock', 'two o clock', 'three o clock', 'four o clock', 'five o clock',
      'six o clock', 'seven o clock', 'eight o clock', 'nine o clock', 'ten o clock',
      'eleven o clock', 'twelve o clock',
      'half past one', 'half past two', 'half past three', 'half past four',
      'half past five', 'half past six', 'half past seven', 'half past eight',
      'half past nine', 'half past ten', 'half past eleven', 'half past twelve',
      'it is one', 'it is two', 'it is three', 'it is four', 'it is five', 'it is six',
      'it is seven', 'it is eight', 'it is nine', 'it is ten', 'it is eleven', 'it is twelve',
      'it s one', 'it s two', 'it s three', 'it s four', 'it s five', 'it s six',
      'it s seven', 'it s eight', 'it s nine', 'it s ten', 'it s eleven', 'it s twelve',
      'at one', 'at two', 'at three', 'at four', 'at five', 'at six',
      'at seven', 'at eight', 'at nine', 'at ten', 'at eleven', 'at twelve'
    ]
  },
  answer_simple_choice: {
    match: [
      'a small one', 'a large one', 'a big one', 'a medium one',
      'the small one', 'the large one', 'the big one', 'the medium one',
      'the first one', 'the second one', 'the red one', 'the blue one',
      'small one please', 'large one please', 'big one please',
      'the small one please', 'the large one please', 'the big one please',
      'small please', 'large please', 'big please',
      'tea please', 'coffee please', 'this one', 'that one',
      'this one please', 'that one please', 'the first', 'the second',
      'a tea please', 'a coffee please', 'a tea', 'a coffee'
    ]
  },
  thank: {
    match: ['thank you', 'thanks', 'thank you very much', 'thanks a lot']
  },
  ask_price: {
    match: [
      'how much is this', 'how much is it', 'how much is that',
      'how much are they', 'how much are these', 'how much',
      'how much does it cost', 'how much does this cost',
      'what is the price', 'what s the price', 'how much is the coffee',
      'excuse me how much'
    ]
  },
  ask_location: {
    match: [
      'where is the', 'where is', 'where s the', 'where s',
      'excuse me where is', 'where can i find', 'where is there',
      'is there a', 'is there any', 'how do i get to', 'where are the'
    ]
  },
  state_basic_self_detail: {
    match: [
      'i am from', 'i m from', 'im from', 'i come from',
      'i live in', 'i live at', 'i work in', 'i work at', 'i work as',
      'i study in', 'i study at', 'i am a student', 'i m a student',
      'i am a teacher', 'i am a worker', 'i am a doctor', 'i am a nurse'
    ]
  },
  describe_family_member_basic: {
    match: [
      'this is my mother', 'this is my father', 'this is my sister',
      'this is my brother', 'this is my wife', 'this is my husband',
      'this is my son', 'this is my daughter', 'this is my family',
      'my mother is', 'my father is', 'my sister is', 'my brother is',
      'my wife is', 'my husband is', 'my son is', 'my daughter is',
      'she is a', 'he is a', 'she is my', 'he is my',
      'i have a sister', 'i have a brother', 'i have two sisters',
      'i have two brothers', 'i have a son', 'i have a daughter'
    ]
  },
  // Comprehension functions are probed by choice tasks in v0 — a free
  // text field cannot evidence them, so the matchers fail closed.
  recognize_greeting: { match: [] },
  understand_identity_question: { match: [] },
  understand_offer_or_order_question: { match: [] },
  identify_spoken_number: { match: [] },
  understand_clock_time: { match: [] },
  understand_simple_choice: { match: [] },
  understand_spoken_price: { match: [] },
  follow_short_direction: { match: [] },
  identify_basic_direction_term: { match: [] },
  read_sign_item: { match: [] },
  write_identity_response: { match: [] }
};

const resolveName = (check, learnerName) => {
  if (!learnerName) return check;
  return {
    ...check,
    match: check.match.map((p) => p.split('<name>').join(learnerName))
  };
};

const scoreFunctions = (task, response, { learnerName } = {}) => {
  const required = task.response?.requiredFunctions ?? [];
  const text = typeof response === 'string' ? response : response?.text ?? '';
  const results = required.map((fn) => {
    const check = FUNCTION_MATCHERS[fn];
    const met = check ? meetsCheck(text, resolveName(check, learnerName)) : false;
    return { fn, met, known: Boolean(check) };
  });
  const met = results.filter((r) => r.met).length;
  const outcome = met === results.length && results.length > 0
    ? 'success'
    : met > 0 ? 'partial' : 'fail';
  return {
    outcome,
    functions: results,
    missed: results.filter((r) => !r.met).map((r) => r.fn),
    /* Free-text scoring cannot attribute the miss: an absent production
     * function means the formulation did not evidence it — whether the
     * learner failed comprehension or production is not knowable from
     * the produced text. Unknown cause → no substrate diagnosis (issue
     * #61: missingFunctions stays empty; normal remediation continues). */
    missingFunctions: []
  };
};

const scoreChoice = (task, optionId) => {
  const options = task.response?.options ?? [];
  const chosen = options.find((o) => o.id === optionId);
  const correct = options.filter((o) => o.correct === true);
  const required = task.response?.requiredFunctions ?? [];
  const success = Boolean(chosen) && correct.some((o) => o.id === chosen.id);
  return {
    outcome: success ? 'success' : 'fail',
    functions: required.map((fn) => ({ fn, met: success, known: true })),
    missed: success ? [] : required,
    /* A choice task's requiredFunctions ARE the thing the option set
     * operationalizes — failing the choice is direct evidence those
     * probed functions did not happen (e.g. a "which number did you
     * hear?" miss attributes the number-catch substrate). Bounded to
     * what the task declared. */
    missingFunctions: success ? [] : [...required]
  };
};

export const EVALUATORS = {
  'eval.required_functions.v1': {
    contractId: 'eval.required_functions.v1',
    describe: 'score = all declared requiredFunctions evidenced by structured match',
    /* This contract cannot attribute a miss to a substrate function —
     * it observes produced text only. */
    attributesFunctions: false,
    score: (task, response, ctx) => scoreFunctions(task, response, ctx)
  },
  'eval.choice.correct.v1': {
    contractId: 'eval.choice.correct.v1',
    describe: 'success iff chosen option flagged correct in task.response.options',
    /* The choice operationalizes the declared requiredFunctions, so a
     * fail justifies them as missingFunctions. */
    attributesFunctions: true,
    score: (task, response) => scoreChoice(task, response?.optionId ?? response)
  }
};

/* Whether an evaluation contract may attribute a failure to specific
 * substrate functions. Demand derivation consults this on the TASK's
 * declared contractId — a stamped missingFunctions on an event whose
 * task contract cannot attribute is never trusted. */
export function contractAttributesFunctions(contractId) {
  return EVALUATORS[contractId]?.attributesFunctions === true;
}

/* Evaluate a learner response under the task's declared contract.
 * Returns null for an unregistered contract — the caller must then
 * record no outcome (never invent one). */
export function evaluateAttempt(task, response, ctx = {}) {
  const evaluator = EVALUATORS[task.evaluation?.contractId];
  if (!evaluator) return null;
  return evaluator.score(task, response, ctx);
}
