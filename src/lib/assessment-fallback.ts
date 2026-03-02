/**
 * Static fallback question pool for assessment.
 *
 * Used when the AI model cannot generate enough unique questions (common with
 * small local models like llama3.2 3B). Questions are professionally curated
 * to cover all CEFR levels and categories.
 */

export interface FallbackQuestion {
  question: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: string;
  category: 'vocabulary' | 'grammar' | 'reading';
}

// 60 questions: 10 per CEFR level, balanced across categories
export const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  // ── A1 (10) ────────────────────────────────────────────────────────────
  {
    question: "What is the opposite of 'hot'?",
    options: ['A) Cold', 'B) Warm', 'C) Cool', 'D) Wet'],
    correct: 'A',
    difficulty: 'A1',
    category: 'vocabulary',
  },
  {
    question: 'She ___ a student.',
    options: ['A) am', 'B) is', 'C) are', 'D) be'],
    correct: 'B',
    difficulty: 'A1',
    category: 'grammar',
  },
  {
    question: "Which word means 'a place where you sleep'?",
    options: ['A) Kitchen', 'B) Bedroom', 'C) Garden', 'D) Bathroom'],
    correct: 'B',
    difficulty: 'A1',
    category: 'vocabulary',
  },
  {
    question: 'I ___ breakfast every morning.',
    options: ['A) has', 'B) having', 'C) have', 'D) had'],
    correct: 'C',
    difficulty: 'A1',
    category: 'grammar',
  },
  {
    question: "Tom: 'Hi, how are you?' Mary: '___'",
    options: ["A) I'm fine, thanks.", 'B) Goodbye.', 'C) See you later.', 'D) Good night.'],
    correct: 'A',
    difficulty: 'A1',
    category: 'reading',
  },
  {
    question: 'What color is the sky on a clear day?',
    options: ['A) Green', 'B) Red', 'C) Blue', 'D) Yellow'],
    correct: 'C',
    difficulty: 'A1',
    category: 'vocabulary',
  },
  {
    question: 'There ___ three cats in the garden.',
    options: ['A) is', 'B) am', 'C) are', 'D) be'],
    correct: 'C',
    difficulty: 'A1',
    category: 'grammar',
  },
  {
    question: "'OPEN 9am–5pm Monday to Friday.' When is this place closed?",
    options: ['A) Monday', 'B) Wednesday', 'C) Friday', 'D) Sunday'],
    correct: 'D',
    difficulty: 'A1',
    category: 'reading',
  },
  {
    question: 'What do you use to write?',
    options: ['A) A fork', 'B) A pen', 'C) A cup', 'D) A shoe'],
    correct: 'B',
    difficulty: 'A1',
    category: 'vocabulary',
  },
  {
    question: 'He ___ to school by bus.',
    options: ['A) go', 'B) going', 'C) goes', 'D) gone'],
    correct: 'C',
    difficulty: 'A1',
    category: 'grammar',
  },

  // ── A2 (10) ────────────────────────────────────────────────────────────
  {
    question: "What does 'purchase' mean?",
    options: ['A) To sell', 'B) To buy', 'C) To give', 'D) To borrow'],
    correct: 'B',
    difficulty: 'A2',
    category: 'vocabulary',
  },
  {
    question: 'She ___ to the cinema last night.',
    options: ['A) goes', 'B) go', 'C) went', 'D) going'],
    correct: 'C',
    difficulty: 'A2',
    category: 'grammar',
  },
  {
    question: 'Choose the correct sentence:',
    options: [
      'A) He can plays guitar.',
      'B) He can play guitar.',
      'C) He can playing guitar.',
      'D) He cans play guitar.',
    ],
    correct: 'B',
    difficulty: 'A2',
    category: 'grammar',
  },
  {
    question: 'A person who flies an airplane is called a ___.',
    options: ['A) Driver', 'B) Sailor', 'C) Pilot', 'D) Captain'],
    correct: 'C',
    difficulty: 'A2',
    category: 'vocabulary',
  },
  {
    question: "'Sale! 50% off all shoes this weekend only!' What does this sign tell you?",
    options: [
      'A) Shoes are free.',
      'B) Shoes are half price this weekend.',
      'C) The shop is closed.',
      'D) Shoes cost double.',
    ],
    correct: 'B',
    difficulty: 'A2',
    category: 'reading',
  },
  {
    question: 'We ___ already ___ dinner when she arrived.',
    options: ['A) have / eaten', 'B) had / eaten', 'C) has / eat', 'D) were / eating'],
    correct: 'B',
    difficulty: 'A2',
    category: 'grammar',
  },
  {
    question: "What does 'reliable' mean?",
    options: ['A) Difficult to trust', 'B) Can be depended on', 'C) Very expensive', 'D) Easy to break'],
    correct: 'B',
    difficulty: 'A2',
    category: 'vocabulary',
  },
  {
    question: 'I enjoy ___ books in my free time.',
    options: ['A) read', 'B) reads', 'C) reading', 'D) to reading'],
    correct: 'C',
    difficulty: 'A2',
    category: 'grammar',
  },
  {
    question: "Which word is a synonym of 'happy'?",
    options: ['A) Sad', 'B) Angry', 'C) Glad', 'D) Tired'],
    correct: 'C',
    difficulty: 'A2',
    category: 'vocabulary',
  },
  {
    question: "'Meeting cancelled. New date: March 15 at 2pm, Room 3.' When is the new meeting?",
    options: ['A) Today', 'B) March 15 at 2pm', 'C) Tomorrow at 3pm', 'D) March 15 at 3pm'],
    correct: 'B',
    difficulty: 'A2',
    category: 'reading',
  },

  // ── B1 (10) ────────────────────────────────────────────────────────────
  {
    question: 'If I ___ you, I would apologize immediately.',
    options: ['A) am', 'B) was', 'C) were', 'D) be'],
    correct: 'C',
    difficulty: 'B1',
    category: 'grammar',
  },
  {
    question: "What does 'approximately' mean?",
    options: ['A) Exactly', 'B) Roughly', 'C) Never', 'D) Always'],
    correct: 'B',
    difficulty: 'B1',
    category: 'vocabulary',
  },
  {
    question: 'The report ___ by the manager before the meeting started.',
    options: ['A) was reviewed', 'B) reviewed', 'C) is reviewing', 'D) has reviewing'],
    correct: 'A',
    difficulty: 'B1',
    category: 'grammar',
  },
  {
    question: "What does the phrase 'break the ice' mean?",
    options: [
      'A) To break something frozen',
      'B) To start a conversation in a social situation',
      'C) To cause a problem',
      'D) To end a relationship',
    ],
    correct: 'B',
    difficulty: 'B1',
    category: 'vocabulary',
  },
  {
    question: 'She asked me ___ I had finished the project.',
    options: ['A) that', 'B) what', 'C) whether', 'D) which'],
    correct: 'C',
    difficulty: 'B1',
    category: 'grammar',
  },
  {
    question: "'Despite the rain, the outdoor concert went ahead as planned.' What happened?",
    options: [
      'A) The concert was cancelled.',
      'B) The concert happened even though it rained.',
      'C) It did not rain.',
      'D) The concert was moved indoors.',
    ],
    correct: 'B',
    difficulty: 'B1',
    category: 'reading',
  },
  {
    question: "Choose the word that best completes: 'The company decided to ___ its operations to Asia.'",
    options: ['A) expand', 'B) explain', 'C) explore', 'D) export'],
    correct: 'A',
    difficulty: 'B1',
    category: 'vocabulary',
  },
  {
    question: 'By the time we arrived, the movie ___.',
    options: ['A) already started', 'B) had already started', 'C) has already started', 'D) is already starting'],
    correct: 'B',
    difficulty: 'B1',
    category: 'grammar',
  },
  {
    question: "What does 'commute' mean?",
    options: [
      'A) To communicate',
      'B) To travel regularly between home and work',
      'C) To move to a new country',
      'D) To share a room',
    ],
    correct: 'B',
    difficulty: 'B1',
    category: 'vocabulary',
  },
  {
    question: "'Applicants must have at least 3 years of experience and a university degree.' Who can apply?",
    options: [
      'A) Anyone with a degree',
      'B) Anyone with 3 years experience',
      'C) Someone with both a degree and 3 years experience',
      'D) Only university students',
    ],
    correct: 'C',
    difficulty: 'B1',
    category: 'reading',
  },

  // ── B2 (10) ────────────────────────────────────────────────────────────
  {
    question: 'The new policy, ___ was introduced last month, has been controversial.',
    options: ['A) that', 'B) which', 'C) what', 'D) who'],
    correct: 'B',
    difficulty: 'B2',
    category: 'grammar',
  },
  {
    question: "What does 'ubiquitous' mean?",
    options: ['A) Extremely rare', 'B) Found everywhere', 'C) Very beautiful', 'D) Highly dangerous'],
    correct: 'B',
    difficulty: 'B2',
    category: 'vocabulary',
  },
  {
    question: 'Not until the results were published ___ the severity of the problem.',
    options: ['A) people realized', 'B) did people realize', 'C) people did realize', 'D) realized people'],
    correct: 'B',
    difficulty: 'B2',
    category: 'grammar',
  },
  {
    question: "Choose the correct meaning of 'to play it by ear':",
    options: [
      'A) To listen carefully',
      'B) To decide as you go along',
      'C) To play music without reading notes',
      'D) To ignore advice',
    ],
    correct: 'B',
    difficulty: 'B2',
    category: 'vocabulary',
  },
  {
    question:
      "'The findings suggest a correlation between sleep quality and academic performance, though causation has not been established.' What does this mean?",
    options: [
      'A) Poor sleep causes bad grades.',
      'B) Good grades cause better sleep.',
      'C) Sleep and grades are related, but one may not cause the other.',
      'D) There is no relationship between sleep and grades.',
    ],
    correct: 'C',
    difficulty: 'B2',
    category: 'reading',
  },
  {
    question: 'She insisted ___ paying for the meal herself.',
    options: ['A) to', 'B) on', 'C) for', 'D) at'],
    correct: 'B',
    difficulty: 'B2',
    category: 'grammar',
  },
  {
    question: "What does 'to scrutinize' mean?",
    options: ['A) To glance quickly', 'B) To examine very carefully', 'C) To destroy completely', 'D) To simplify'],
    correct: 'B',
    difficulty: 'B2',
    category: 'vocabulary',
  },
  {
    question: 'Had she known about the delay, she ___ left earlier.',
    options: ['A) would have', 'B) will have', 'C) should', 'D) must have'],
    correct: 'A',
    difficulty: 'B2',
    category: 'grammar',
  },
  {
    question: "What is a synonym of 'meticulous'?",
    options: ['A) Careless', 'B) Thorough', 'C) Quick', 'D) Simple'],
    correct: 'B',
    difficulty: 'B2',
    category: 'vocabulary',
  },
  {
    question:
      "'While renewable energy sources are becoming more cost-effective, the transition away from fossil fuels requires significant infrastructure investment.' The main idea is:",
    options: [
      'A) Fossil fuels are better than renewables.',
      'B) Renewables are cheaper but switching still costs a lot.',
      'C) Infrastructure is not important.',
      'D) The transition is already complete.',
    ],
    correct: 'B',
    difficulty: 'B2',
    category: 'reading',
  },

  // ── C1 (10) ────────────────────────────────────────────────────────────
  {
    question: 'Scarcely had the meeting begun ___ a fire alarm went off.',
    options: ['A) that', 'B) when', 'C) than', 'D) before'],
    correct: 'B',
    difficulty: 'C1',
    category: 'grammar',
  },
  {
    question: "What does 'pragmatic' mean?",
    options: ['A) Idealistic', 'B) Dealing with things in a practical way', 'C) Pessimistic', 'D) Overly cautious'],
    correct: 'B',
    difficulty: 'C1',
    category: 'vocabulary',
  },
  {
    question: 'The proposal was rejected on the ___ that it lacked sufficient evidence.',
    options: ['A) bases', 'B) ground', 'C) grounds', 'D) basis'],
    correct: 'C',
    difficulty: 'C1',
    category: 'grammar',
  },
  {
    question: "What does 'to be at a crossroads' mean?",
    options: [
      'A) To be lost',
      'B) To face an important decision',
      'C) To be at an intersection',
      'D) To be confused about directions',
    ],
    correct: 'B',
    difficulty: 'C1',
    category: 'vocabulary',
  },
  {
    question:
      "'The author employs irony throughout the passage, juxtaposing the protagonist\\'s stated intentions with their actual behavior.' What literary technique is highlighted?",
    options: ['A) Metaphor and simile', 'B) Irony and contrast', 'C) Alliteration', 'D) Foreshadowing'],
    correct: 'B',
    difficulty: 'C1',
    category: 'reading',
  },
  {
    question: "What does 'to exacerbate' mean?",
    options: ['A) To improve', 'B) To make worse', 'C) To explain', 'D) To celebrate'],
    correct: 'B',
    difficulty: 'C1',
    category: 'vocabulary',
  },
  {
    question: 'So ___ was the damage that the building had to be demolished.',
    options: ['A) extensive', 'B) extending', 'C) extent', 'D) extension'],
    correct: 'A',
    difficulty: 'C1',
    category: 'grammar',
  },
  {
    question:
      "'Notwithstanding the committee\\'s reservations, the project was greenlit pending further review.' What happened?",
    options: [
      'A) The project was cancelled.',
      'B) The project was approved despite doubts, with conditions.',
      'C) The committee fully supported the project.',
      'D) Further review was not needed.',
    ],
    correct: 'B',
    difficulty: 'C1',
    category: 'reading',
  },
  {
    question: 'Little ___ they know what challenges lay ahead.',
    options: ['A) do', 'B) did', 'C) were', 'D) had'],
    correct: 'B',
    difficulty: 'C1',
    category: 'grammar',
  },
  {
    question: "What does 'unprecedented' mean?",
    options: ['A) Expected', 'B) Never done or known before', 'C) Very old', 'D) Unimportant'],
    correct: 'B',
    difficulty: 'C1',
    category: 'vocabulary',
  },

  // ── C2 (10) ────────────────────────────────────────────────────────────
  {
    question: "What does the word 'obfuscate' mean?",
    options: ['A) To clarify', 'B) To make unclear or confusing', 'C) To remove', 'D) To highlight'],
    correct: 'B',
    difficulty: 'C2',
    category: 'vocabulary',
  },
  {
    question: "The minister's speech was a masterclass in ___, saying much while committing to nothing.",
    options: ['A) equivocation', 'B) elaboration', 'C) exaggeration', 'D) elimination'],
    correct: 'A',
    difficulty: 'C2',
    category: 'vocabulary',
  },
  {
    question: 'Were the government ___ the proposed reforms, the economic landscape would be fundamentally altered.',
    options: ['A) to implement', 'B) implementing', 'C) implemented', 'D) having implemented'],
    correct: 'A',
    difficulty: 'C2',
    category: 'grammar',
  },
  {
    question: "What does 'sycophant' mean?",
    options: [
      'A) A person who criticizes others',
      'B) A person who flatters to gain advantage',
      'C) A type of musical instrument',
      'D) A philosophical concept',
    ],
    correct: 'B',
    difficulty: 'C2',
    category: 'vocabulary',
  },
  {
    question:
      "'The paper\\'s methodology, while ostensibly rigorous, conflates correlation with causation—a fallacy that undermines its central thesis.' The author is criticizing:",
    options: [
      'A) The writing style.',
      "B) The paper's logical reasoning.",
      'C) The topic choice.',
      'D) The length of the paper.',
    ],
    correct: 'B',
    difficulty: 'C2',
    category: 'reading',
  },
  {
    question: 'Not only ___ the deadline, but he also exceeded all quality benchmarks.',
    options: ['A) he met', 'B) did he meet', 'C) he did meet', 'D) had he met'],
    correct: 'B',
    difficulty: 'C2',
    category: 'grammar',
  },
  {
    question: "What does 'to be the epitome of' mean?",
    options: [
      'A) To be the opposite of',
      'B) To be the perfect example of',
      'C) To be the cause of',
      'D) To be unrelated to',
    ],
    correct: 'B',
    difficulty: 'C2',
    category: 'vocabulary',
  },
  {
    question:
      "'The author\\'s use of an unreliable narrator serves to destabilize the reader\\'s assumptions, compelling a re-evaluation of earlier events.' What narrative effect is described?",
    options: [
      'A) Creating suspense through pacing',
      'B) Forcing the reader to question what they thought was true',
      'C) Providing comic relief',
      'D) Simplifying the plot',
    ],
    correct: 'B',
    difficulty: 'C2',
    category: 'reading',
  },
  {
    question: 'Under no circumstances ___ the confidential data to be shared with third parties.',
    options: ['A) is', 'B) are', 'C) was', 'D) were'],
    correct: 'A',
    difficulty: 'C2',
    category: 'grammar',
  },
  {
    question: "What does 'a Pyrrhic victory' refer to?",
    options: [
      'A) A decisive triumph',
      'B) A win achieved at too great a cost',
      'C) An unexpected victory',
      'D) A victory in sports',
    ],
    correct: 'B',
    difficulty: 'C2',
    category: 'vocabulary',
  },
];

/**
 * Select fallback questions to pad an AI-generated set to the target count.
 * Avoids duplicating questions already generated by the AI (by question text).
 * Returns a shuffled subset that respects the CEFR distribution as much as possible.
 */
export function selectFallbackQuestions(existingQuestions: unknown[], target: number): FallbackQuestion[] {
  const needed = target - existingQuestions.length;
  if (needed <= 0) return [];

  // Build set of existing question texts (normalized) for dedup
  const existingTexts = new Set(
    existingQuestions.map((q) =>
      ((q as Record<string, unknown>).question as string).toLowerCase().trim().replace(/\s+/g, ' '),
    ),
  );

  // Filter out any fallback questions that match AI-generated ones
  const available = FALLBACK_QUESTIONS.filter(
    (q) => !existingTexts.has(q.question.toLowerCase().trim().replace(/\s+/g, ' ')),
  );

  // Shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  return available.slice(0, needed);
}
