import { nanoid } from 'nanoid';
import type { LearningActivity, LearningAttempt } from '@/types/learning-activity';

export const LEARNING_ACTIVITIES: LearningActivity[] = [
  'comprehension',
  'writing',
  'retelling',
  'personal-example',
  'sentence-pronunciation',
];
const prompts: Record<LearningActivity, [string, string]> = {
  comprehension: [
    'Explain the main idea in your own words. Identify one important detail and quote the exact evidence supporting it.',
    '用自己的话解释主旨，指出一个重要细节，并引用支持它的原文依据。',
  ],
  writing: [
    'Write your own short update or summary inspired by this material. Include a clear main point, supporting detail and conclusion. Do not copy the source.',
    '围绕本课材料自主写一段更新或摘要，包含主旨、细节与结论，不要抄写原文。',
  ],
  retelling: [
    'Hide the source, then retell its main idea and two details aloud. Record yourself and add a short summary of what you said.',
    '隐藏原文后，口头复述主旨与两个细节。录音后简述自己说了什么。',
  ],
  'personal-example': [
    'Choose an expression from the source and use it in your own new situation. Explain the context.',
    '选择原文中的一个表达，在自己的新情境中造句，并说明语境。',
  ],
  'sentence-pronunciation': [
    'Choose one sentence. Mark stressed words and thought groups, record it, then listen for stress, rhythm and linking. Retry after noting one change.',
    '选择一句，标记重读词与意群，录音并回听重音、节奏和连读。记录一个改进点后重录。',
  ],
};
export function activityPrompt(activity: LearningActivity, zh = false) {
  return prompts[activity][zh ? 1 : 0];
}
export function validateLearningResponse(
  activity: LearningActivity,
  source: string,
  answer: string,
  quote = '',
  recordingId?: string,
): 'answer' | 'quote' | 'recording' | null {
  if (!answer.trim()) return 'answer';
  if (activity === 'comprehension' && (!quote.trim() || !source.includes(quote.trim()))) return 'quote';
  if ((activity === 'retelling' || activity === 'sentence-pronunciation') && !recordingId) return 'recording';
  return null;
}
type AttemptInput = Pick<
  LearningAttempt,
  'lessonId' | 'unitId' | 'activity' | 'sourceText' | 'sourceContentIds' | 'answer'
> &
  Partial<
    Pick<LearningAttempt, 'evidenceQuote' | 'parentAttemptId' | 'recordingId' | 'feedback' | 'sourceWeakSpotId'>
  > & { notes?: string };
export function createLearningAttempt(input: AttemptInput, now = Date.now()): LearningAttempt {
  return {
    id: nanoid(),
    lessonId: input.lessonId,
    unitId: input.unitId,
    activity: input.activity,
    sourceText: input.sourceText,
    sourceContentIds: [...input.sourceContentIds],
    prompt: activityPrompt(input.activity),
    answer: input.answer.trim(),
    evidenceQuote: input.evidenceQuote?.trim(),
    parentAttemptId: input.parentAttemptId,
    recordingId: input.recordingId,
    sourceWeakSpotId: input.sourceWeakSpotId,
    status: input.parentAttemptId ? 'revised' : 'submitted',
    feedback: input.feedback
      ? structuredClone(input.feedback)
      : {
          source: 'self',
          notes: input.notes?.trim() ?? '',
          checklist: ['Meaning and task coverage', 'Supporting evidence or personal context', 'One change to try next'],
        },
    createdAt: now,
    updatedAt: now,
  };
}

function isGenuineRevision(attempt: LearningAttempt, attempts: LearningAttempt[]): boolean {
  const parent = attempts.find((item) => item.id === attempt.parentAttemptId);
  const changed =
    attempt.activity === 'retelling' || attempt.activity === 'sentence-pronunciation'
      ? !!parent?.recordingId && !!attempt.recordingId && parent.recordingId !== attempt.recordingId
      : parent?.answer !== attempt.answer;
  return (
    !!parent &&
    parent.lessonId === attempt.lessonId &&
    parent.activity === attempt.activity &&
    parent.createdAt <= attempt.createdAt &&
    changed
  );
}

/** Content address prevents a repeated Save/upload of identical audio inventing retry evidence. */
export async function recordingIdentity(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return `recording:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Completion means work submitted and revised, never a claim of mastery. */
export function workshopProgress(lessonId: string, attempts: LearningAttempt[]) {
  const own = attempts.filter((item) => item.lessonId === lessonId);
  const comprehension = own.some(
    (item) =>
      item.activity === 'comprehension' &&
      !validateLearningResponse(item.activity, item.sourceText, item.answer, item.evidenceQuote),
  );
  const writing = own.some((item) => item.activity === 'writing' && isGenuineRevision(item, own));
  return {
    comprehension,
    writing,
    completed: comprehension && writing,
    completedSteps: Number(comprehension) + Number(writing),
    total: 2,
  };
}

export function canResolveTransfer(weakSpotId: string, lastSeenAt: number, attempts: LearningAttempt[]): boolean {
  const own = attempts.filter((item) => item.sourceWeakSpotId === weakSpotId && item.createdAt > lastSeenAt);
  return own.some(
    (retry) =>
      retry.activity !== 'personal-example' &&
      isGenuineRevision(retry, own) &&
      own.some(
        (example) =>
          example.activity === 'personal-example' &&
          example.answer.trim().length > 0 &&
          example.createdAt >= retry.createdAt,
      ),
  );
}
