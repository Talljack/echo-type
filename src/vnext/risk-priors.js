/*
 * Vietnamese learner risk priors v0 (capability-model-v0.md §6).
 *
 * Population-level risk — NOT learner facts. A prior may schedule a
 * diagnostic probe; it may never mark a learner weak without observed
 * evidence. Keeping them in a separate module is structural honesty:
 * the projection layer cannot even see them.
 */

const prior = (id, appliesTo) => ({
  id,
  appliesTo,
  mayTriggerProbe: true,
  learnerStateEffect: 'none_without_observed_evidence'
});

export const RISK_PRIORS = [
  prior('vn.word_final_consonants', ['spoken_production', 'spoken_interaction']),
  prior('vn.consonant_clusters', ['spoken_production', 'spoken_interaction']),
  prior('vn.theta_eth', ['spoken_production', 'spoken_interaction', 'listening']),
  prior('vn.lexical_stress', ['spoken_production', 'spoken_interaction']),
  prior('vn.english_intonation', ['spoken_interaction', 'listening']),
  prior('vn.articles', ['writing', 'spoken_production']),
  prior('vn.copula_be', ['writing', 'spoken_production', 'spoken_interaction']),
  prior('vn.inflectional_endings', ['spoken_production', 'spoken_interaction', 'writing']),
  prior('vn.question_formation', ['spoken_interaction', 'writing']),
  prior('vn.tense_aspect', ['spoken_production', 'spoken_interaction', 'writing']),
  prior('vn.prepositions_collocations', ['writing', 'spoken_production']),
  prior('vn.speaking_anxiety_support', ['spoken_interaction', 'spoken_production'])
];

export function priorById(id) {
  return RISK_PRIORS.find((p) => p.id === id) || null;
}
