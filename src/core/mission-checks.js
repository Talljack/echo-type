/*
 * Deterministic communicative-goal matching for mission exit checks
 * (issue #33). Each `match` entry is one of:
 *
 *   'two or more'   — an ordered phrase, matched on word boundaries. A
 *                     question form only counts when the whole form is
 *                     present: 'your name' alone is not an ask, and
 *                     'i am your name' is not 'i am linh'.
 *   'word'          — one exact token (greeting forms like 'hi').
 *
 * Name checks compare against the learner's OWN name: the mission
 * captures it up front and resolves `<name>` inside match patterns
 * before scoring, so 'i am <name>' is the honest expected utterance —
 * not any stem + word. No keyword bags, no blacklists.
 *
 * Everything is pure text — no DOM — so the unit tests pin the
 * counterexamples without a browser.
 */

// Canonical form: lowercase, punctuation stripped, contractions expanded —
// "I'm"/"im"/"i am" all land on the same token stream.
const EXPANSIONS = {
  "i'm": ['i', 'am'],
  im: ['i', 'am'],
  "what's": ['what', 'is'],
  whats: ['what', 'is'],
  "it's": ['it', 'is'],
  its: ['it', 'is'],
  "that's": ['that', 'is'],
  thats: ['that', 'is'],
  "you're": ['you', 'are'],
  "we're": ['we', 'are'],
  "they're": ['they', 'are'],
  "don't": ['do', 'not'],
  "doesn't": ['does', 'not'],
  "can't": ['can', 'not'],
  "won't": ['will', 'not']
};

export function canonLine(value) {
  const flat = String(value || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?…;:()"“”«»]/g, ' ')
    // Learner names are often Vietnamese — "Hoàng" entered once must
    // still match "i am hoang" typed without diacritics. NFD-stripping
    // marks + đ→d covers it; English text is unaffected.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks U+0300–U+036F
    .replace(/\u0111/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
  return flat
    .split(' ')
    .filter(Boolean)
    .flatMap((word) => EXPANSIONS[word] || [word])
    .join(' ');
}

// Ordered phrase match on word boundaries — indexOf alone would accept
// 'what is your name' inside 'what is your namesake'.
function phraseAt(canon, phrase) {
  let idx = canon.indexOf(phrase);
  while (idx !== -1) {
    const before = idx === 0 || canon[idx - 1] === ' ';
    const end = idx + phrase.length;
    const after = end === canon.length || canon[end] === ' ';
    if (before && after) return true;
    idx = canon.indexOf(phrase, idx + 1);
  }
  return false;
}

export function meetsCheck(response, check) {
  const canon = canonLine(response);
  const tokens = new Set(canon.split(' ').filter(Boolean));
  return (Array.isArray(check?.match) ? check.match : []).some((pattern) => {
    const p = canonLine(pattern);
    if (!p) return false;
    return p.includes(' ') ? phraseAt(canon, p) : tokens.has(p);
  });
}

export function scoreExitTurn(turn, response) {
  const checks = (Array.isArray(turn?.checks) ? turn.checks : []).map((check) => ({
    key: check.key,
    label: check.label,
    hint: check.hint,
    met: meetsCheck(response, check)
  }));
  const met = checks.filter((c) => c.met).length;
  return { checks, met, total: checks.length, score: checks.length ? met / checks.length : 1 };
}
