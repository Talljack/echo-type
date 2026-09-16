'use client';

import { useEffect, useRef, useState } from 'react';
import { ReadAloudContent } from '@/components/read-aloud';
import { TranslationBar } from '@/components/translation/translation-bar';
import { useTranslation } from '@/hooks/use-translation';
import { db } from '@/lib/db';
import { createLearningAttempt } from '@/lib/learning-activity';
import { persistLearningAttempt } from '@/lib/learning-activity-persistence';
import { alignPracticeTranslations } from '@/lib/practice-translation';
import { deriveTextCycle, validateTextCycleAttempt } from '@/lib/text-learning-cycle';
import { loadWorkshopDraft, saveWorkshopDraft } from '@/lib/workshop-draft';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useTTSStore } from '@/stores/tts-store';
import type { LearningAttempt, RecallRating } from '@/types/learning-activity';
import type { Lesson } from '@/types/learning-unit';

const button =
  'min-h-11 rounded-xl px-4 py-2 text-sm font-medium active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50';
const input =
  'mt-2 min-h-24 w-full rounded-xl bg-slate-50 p-3 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500';

export function TextCyclePractice({
  lesson,
  stage,
  zh,
  attempts,
  now,
  sourceWeakSpotId,
}: {
  lesson: Lesson;
  stage: 'recall' | 'apply';
  zh: boolean;
  attempts: LearningAttempt[];
  now: number;
  sourceWeakSpotId?: string;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const source = lesson.exercises.map((item) => item.text).join('\n\n');
  const cycle = deriveTextCycle(lesson.id, source, attempts, now);
  const reference = attempts.find((item) => item.id === cycle.referenceAttemptId);
  const [answer, setAnswer] = useState('');
  const [expression, setExpression] = useState('');
  const [context, setContext] = useState('');
  const [assisted, setAssisted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [compared, setCompared] = useState(false);
  const [rating, setRating] = useState<RecallRating>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const mounted = useRef(true);
  const database = db;
  const draftStage = JSON.stringify([stage, reference?.id, sourceWeakSpotId]);
  const visible = stage === 'apply' || revealed || compared;
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.read);
  const targetLang = useTTSStore((s) => s.targetLang);
  const translations = useTranslation(source, targetLang, {
    visible: visible && showTranslation,
    shouldPrefetch: false,
  });
  const scope = { databaseName: database.name, lessonId: lesson.id, activity: stage, stage: draftStage, source };
  useEffect(() => {
    mounted.current = true;
    try {
      const result = loadWorkshopDraft(
        { databaseName: database.name, lessonId: lesson.id, activity: stage, stage: draftStage, source },
        localStorage,
      );
      setDraftError(!!result.error);
      if (result.draft) {
        setAnswer(result.draft.answer);
        setExpression(result.draft.quote);
        setContext(result.draft.context ?? '');
        setAssisted(!!result.draft.usedSource || !!result.draft.usedTranslation);
      }
    } catch {
      setDraftError(true);
    }
    setReady(true);
    return () => {
      mounted.current = false;
    };
  }, [database, lesson.id, stage, draftStage, source]);
  useEffect(() => {
    if (!ready || db !== database) return;
    try {
      const result = saveWorkshopDraft(
        { databaseName: database.name, lessonId: lesson.id, activity: stage, stage: draftStage, source },
        { answer, quote: expression, notes: '', context, usedSource: assisted || compared },
        localStorage,
      );
      setDraftError(!!result.error);
    } catch {
      setDraftError(true);
    }
  }, [ready, database, lesson.id, stage, draftStage, source, answer, expression, context, assisted, compared]);
  const available = stage === 'recall' ? cycle.reviewStatus === 'due' : cycle.stages.recall;
  async function save() {
    if (!reference || !available || saved || busy || (stage === 'recall' && !compared)) return;
    const isCurrent = () => mounted.current && db === database;
    const attempt = createLearningAttempt({
      lessonId: lesson.id,
      unitId: lesson.unitId,
      sourceText: source,
      sourceContentIds: lesson.exercises.map((item) => item.metadata?.lessonSourceId ?? item.id),
      sourceWeakSpotId,
      activity: stage === 'recall' ? 'writing' : 'personal-example',
      answer,
      notes: stage === 'recall' ? `Self-review: ${rating ?? ''}${assisted ? ' (source assistance)' : ''}` : context,
      cycle: {
        stage,
        referenceAttemptId: reference.id,
        rating: stage === 'recall' ? rating : undefined,
        assisted: stage === 'recall' && assisted,
        sourceRevealed: stage === 'recall' && assisted,
        expression: stage === 'apply' ? expression : undefined,
        context: stage === 'apply' ? context : undefined,
      },
    });
    const invalid = validateTextCycleAttempt(attempt, attempts);
    if (invalid) {
      setMessage(
        invalid === 'expression'
          ? t('Use an exact source expression in your new example.', '请在新例句中使用一个来自原文的表达。')
          : invalid === 'context' || invalid === 'new-answer'
            ? t(
                'Describe a new situation and write your own example, not a copy of the source.',
                '请描述新情境并自主造句，不要复制原文。',
              )
            : t(
                'Complete the answer and self-review first. Recall must be due before it can be saved.',
                '请完成回答与自评，复习需到期后才能保存。',
              ),
      );
      return;
    }
    setBusy(true);
    try {
      await persistLearningAttempt(database, attempt, undefined, isCurrent);
      if (!isCurrent()) return;
      setSaved(true);
      setMessage(
        stage === 'recall'
          ? t('Recall saved. Your next review is scheduled from this result.', '复习已保存，下一次复习已根据结果安排。')
          : t(
              'Application saved. Keep using this expression in real situations.',
              '运用已保存，请继续在真实情境中使用。',
            ),
      );
      // Clear only this saved draft, never immutable learning evidence.
      const result = saveWorkshopDraft(
        scope,
        { answer: '', quote: '', notes: '', context: '', usedSource: false },
        localStorage,
      );
      setDraftError(!!result.error);
    } catch {
      if (isCurrent()) setMessage(t('Save failed. Your answer is still here; retry.', '保存失败，回答仍在，请重试。'));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6"
      aria-label={t('Recall and apply', '复习与运用')}
    >
      <h3 className="text-lg font-semibold text-indigo-950">
        {stage === 'recall'
          ? t('Recall before looking', '先回忆，再对照')
          : t('Use it in your own life', '用在自己的生活中')}
      </h3>
      <p className="text-sm leading-6 text-slate-600">
        {stage === 'recall'
          ? t(
              'Without opening the source, explain its main idea and a detail. Then compare and rate honestly. This is self-review, not an automatic score.',
              '先不看原文，回忆主旨与一个细节。提交对照后如实自评，这不是自动评分。',
            )
          : t(
              'Choose an expression, describe a different situation, and write a new example using it.',
              '选一个原文表达，描述不同的新情境，并用它写一个自己的例句。',
            )}
      </p>
      {!available && !saved && (
        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
          <p className="font-semibold">
            {stage === 'recall' && reference
              ? t('Recall scheduled', '复习已安排')
              : t('Finish the earlier stages first', '请先完成前面的阶段')}
          </p>
          <p>
            {cycle.dueAt && stage === 'recall'
              ? `${t('Due: ', '到期：')}${new Date(cycle.dueAt).toLocaleString(zh ? 'zh-CN' : 'en-US')}`
              : t(
                  'Save comprehension, an original response and a correction; recall it later before applying it.',
                  '先保存理解、原创输出和纠错；延迟复习后再进行运用。',
                )}
          </p>
        </div>
      )}
      {draftError && (
        <p role="alert" className="text-sm text-amber-800">
          {t(
            'Draft storage is unavailable. Keep this page open until you save your answer.',
            '草稿存储不可用，请保留页面直至保存回答。',
          )}
        </p>
      )}
      {stage === 'recall' && !compared && (
        <button
          type="button"
          disabled={busy || saved || revealed}
          className={`${button} bg-slate-100 text-slate-700`}
          onClick={() => {
            setRevealed(true);
            setAssisted(true);
          }}
        >
          {t('Show a hint · counts as assisted', '查看提示 · 记录为辅助练习')}
        </button>
      )}
      {visible && (
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-indigo-950">{t('Source material', '原文材料')}</p>
          <TranslationBar module="read" />
          <div className="max-h-56 overflow-y-auto text-base leading-7 text-slate-800">
            <ReadAloudContent
              text={source}
              showTranslation={showTranslation}
              sentenceTranslations={alignPracticeTranslations(source, translations.sentenceTranslations)}
            />
            {showTranslation && translations.isLoading && <p>{t('Translating…', '翻译中…')}</p>}
            {showTranslation && translations.error && (
              <button type="button" className={button} onClick={translations.retry}>
                {t('Retry translation', '重试翻译')}
              </button>
            )}
          </div>
          {compared && reference && (
            <div className="mt-3 text-sm text-slate-700">
              <h4 className="font-semibold">{t('Your earlier correction', '之前的修改稿')}</h4>
              <p className="whitespace-pre-wrap">{reference.answer}</p>
              <p className="mt-2">{reference.feedback.notes}</p>
            </div>
          )}
        </div>
      )}
      {stage === 'apply' && (
        <>
          <label className="block text-sm font-medium">
            {t('Expression from the source', '原文中的表达')}
            <input
              className={input}
              value={expression}
              disabled={busy || saved || !available}
              onChange={(e) => setExpression(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            {t('New situation', '新情境')}
            <textarea
              className={input}
              value={context}
              disabled={busy || saved || !available}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
        </>
      )}
      <label className="block text-sm font-medium">
        {stage === 'recall' ? t('Recall from memory', '凭记忆回答') : t('Your new example', '你的新例句')}
        <textarea
          className={input}
          value={answer}
          disabled={busy || saved || !available || compared}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </label>
      {stage === 'recall' && (
        <>
          {!compared && (
            <button
              type="button"
              className={`${button} bg-indigo-50 text-indigo-700`}
              disabled={busy || saved || !available || !answer.trim()}
              onClick={() => setCompared(true)}
            >
              {t('Compare my answer', '对照我的回答')}
            </button>
          )}
          {compared && (
            <fieldset disabled={busy || saved} className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">{t('How did you recall it?', '回忆情况如何？')}</legend>
              {(['again', 'hard', 'good', 'easy'] as RecallRating[]).map((value) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recall-rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  {
                    {
                      again: t('Again · missed key information', '重来 · 遗漏关键信息'),
                      hard: t('Hard · recalled with effort', '困难 · 费力回忆出来'),
                      good: t('Good · recalled independently', '良好 · 独立回忆出来'),
                      easy: t('Easy · recalled confidently', '轻松 · 顺利回忆出来'),
                    }[value]
                  }
                </label>
              ))}
            </fieldset>
          )}
          {assisted && (
            <p className="text-sm text-amber-800">
              {t(
                'Hint used. This remains assisted practice regardless of your rating; you will retry sooner.',
                '使用过提示。本次会记录为辅助练习，不受自评分档影响，并安排较早重试。',
              )}
            </p>
          )}
        </>
      )}
      <button
        type="button"
        className={`${button} bg-indigo-600 text-white`}
        disabled={busy || saved || !available || !answer.trim() || (stage === 'recall' && (!compared || !rating))}
        onClick={() => void save()}
      >
        {busy
          ? t('Saving…', '保存中…')
          : stage === 'recall'
            ? t('Save recall', '保存复习')
            : t('Save application', '保存运用')}
      </button>
      {message && (
        <p role="status" className="text-sm text-indigo-700">
          {message}
        </p>
      )}
    </section>
  );
}
