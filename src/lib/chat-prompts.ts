import type { ExerciseType } from '@/types/chat';

// ─── Block Format Instructions ──────────────────────────────────────────────

const BLOCK_FORMAT_INSTRUCTIONS = `
IMPORTANT: When generating interactive exercises, use triple-colon fenced blocks with JSON content.
Format: :::type
{json}
:::

Available block types:
- :::quiz — Multiple choice question
- :::fill-blank — Sentence with blanks to fill
- :::translation — Source/target translation pair
- :::audio — Text with TTS playback
- :::vocab — Vocabulary word card
- :::reading — Segmented reading passage
- :::analytics — Statistics display

Do NOT use markdown code blocks (\`\`\`) for these. Use triple-colon (:::) fences only.
`;

// ─── Prompt Templates ───────────────────────────────────────────────────────

export function translationPrompt(text: string, difficulty: string = 'intermediate'): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Generate a translation exercise for the following English text. Difficulty: ${difficulty}.

Text: "${text}"

Create 2-3 translation exercises. For each, output a :::translation block:
:::translation
{"source": "English sentence", "sourceLang": "English", "target": "中文翻译", "targetLang": "Chinese"}
:::

After the exercises, provide a brief explanation of key vocabulary or grammar points.`;
}

export function fillBlankPrompt(text: string, difficulty: string = 'intermediate'): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Generate fill-in-the-blank exercises based on this English text. Difficulty: ${difficulty}.

Text: "${text}"

Create 3-4 fill-in-the-blank exercises. Use ___ for each blank. Output each as:
:::fill-blank
{"sentence": "She ___ to the store yesterday.", "answers": ["went"], "hints": ["past tense of 'go'"]}
:::

Focus on key vocabulary and grammar from the text.`;
}

export function quizPrompt(text: string, difficulty: string = 'intermediate'): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Generate multiple choice quiz questions based on this English text. Difficulty: ${difficulty}.

Text: "${text}"

Create 3-4 quiz questions. Output each as:
:::quiz
{"question": "What does 'elaborate' mean in this context?", "options": ["Simple", "Detailed and complex", "Quick", "Basic"], "correctIndex": 1, "explanation": "In this context, 'elaborate' means detailed and carefully planned."}
:::

Include vocabulary, comprehension, and grammar questions.`;
}

export function dictationPrompt(text: string, difficulty: string = 'intermediate'): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Create a dictation exercise using this text. Difficulty: ${difficulty}.

Text: "${text}"

First, output the text as an audio block for the student to listen to:
:::audio
{"text": "${text.replace(/"/g, '\\"')}", "label": "Listen and type what you hear"}
:::

Then provide 2-3 key sentences from the text as separate audio blocks for focused practice:
:::audio
{"text": "individual sentence here", "label": "Sentence 1"}
:::

After the exercises, mention any tricky words or sounds to watch for.`;
}

export function readingPrompt(text: string, title?: string): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Guide the student through reading this English text. Break it into manageable segments.

${title ? `Title: "${title}"` : ''}
Text: "${text}"

Output a reading block with the text split into segments:
:::reading
{"title": "${title || 'Reading Practice'}", "segments": [{"id": "seg1", "text": "First paragraph or section...", "translation": "中文翻译..."}, {"id": "seg2", "text": "Second paragraph...", "translation": "中文翻译..."}]}
:::

After the reading block, provide a brief introduction and then ask a comprehension question using a quiz block.`;
}

export function analyticsPrompt(analyticsData: Record<string, unknown>): string {
  return `${BLOCK_FORMAT_INSTRUCTIONS}

Analyze the student's learning progress data below and provide insights.

Learning Data:
${JSON.stringify(analyticsData, null, 2)}

First, display key stats using an analytics block:
:::analytics
{"stats": [{"label": "Total Sessions", "value": 0}, {"label": "Avg Accuracy", "value": "0%"}, {"label": "Avg WPM", "value": 0}]}
:::

Then provide:
1. A summary of their progress
2. Specific strengths and weaknesses
3. Recommended focus areas
4. Suggested exercises to improve weak areas`;
}

/**
 * Returns a short, user-facing message shown in the chat bubble.
 */
export function getUserMessageForExercise(exerciseType: ExerciseType): string {
  switch (exerciseType) {
    case 'translation':
      return 'Give me a translation exercise for this content.';
    case 'fill-blank':
      return 'Give me a fill-in-the-blank exercise for this content.';
    case 'quiz':
      return 'Give me a quiz about this content.';
    case 'dictation':
      return 'Give me a dictation exercise for this content.';
  }
}

/**
 * Returns the detailed system-level instruction prompt sent to the AI.
 * This is NOT shown to the user — it goes into the system prompt context.
 */
export function getPromptForExercise(
  exerciseType: ExerciseType,
  text: string,
  difficulty: string = 'intermediate',
): string {
  switch (exerciseType) {
    case 'translation':
      return translationPrompt(text, difficulty);
    case 'fill-blank':
      return fillBlankPrompt(text, difficulty);
    case 'quiz':
      return quizPrompt(text, difficulty);
    case 'dictation':
      return dictationPrompt(text, difficulty);
  }
}
