'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ReadAloudContent } from '@/components/read-aloud';
import { TranslationBar } from '@/components/translation/translation-bar';
import { useTranslation } from '@/hooks/use-translation';
import { db } from '@/lib/db';
import {
  activityPrompt,
  canResolveTransfer,
  createLearningAttempt,
  LEARNING_ACTIVITIES,
  validateLearningResponse,
} from '@/lib/learning-activity';
import { persistLearningAttempt } from '@/lib/learning-activity-persistence';
import { alignPracticeTranslations } from '@/lib/practice-translation';
import { deriveTextCycle, validateTextCorrection } from '@/lib/text-learning-cycle';
import { loadWorkshopDraft, saveWorkshopDraft } from '@/lib/workshop-draft';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useTTSStore } from '@/stores/tts-store';
import type { LearningActivity, LearningAttempt, TextCycleStage } from '@/types/learning-activity';
import type { Lesson } from '@/types/learning-unit';
import { TextCyclePractice } from './text-cycle-practice';

const button =
  'min-h-11 rounded-xl px-4 py-2 text-sm font-medium active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50';
export function LessonWorkshop({
  lesson,
  zh,
  sourceWeakSpotId,
}: {
  lesson: Lesson;
  zh: boolean;
  sourceWeakSpotId?: string;
}) {
  const query = useSearchParams();
  const stages: TextCycleStage[] = ['understand', 'output', 'correct', 'recall', 'apply'];
  const requested = query.get('stage') as TextCycleStage;
  const [chosenStage, setChosenStage] = useState<TextCycleStage>(stages.includes(requested) ? requested : 'understand');
  const [optional, setOptional] = useState(false);
  const [activity, setActivity] = useState<LearningActivity>('comprehension');
  const attempts =
    useLiveQuery(() => db.learningAttempts.where('lessonId').equals(lesson.id).toArray(), [lesson.id]) ?? [];
  const weakSpots = useLiveQuery(() => db.weakSpots.toArray(), [lesson.id]) ?? [];
  const source = lesson.exercises.map((item) => item.text).join('\n\n');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const progress = deriveTextCycle(lesson.id, source, attempts, Math.max(now, Date.now()));
  const stage = chosenStage ?? progress.nextStage;
  const activeActivity = optional ? activity : stage === 'understand' ? 'comprehension' : 'writing';
  const labels: Record<TextCycleStage, string> = {
    understand: zh ? '理解' : 'Understand',
    output: zh ? '输出' : 'Output',
    correct: zh ? '纠错' : 'Correct',
    recall: zh ? '复习' : 'Recall',
    apply: zh ? '运用' : 'Apply',
  };
  const choose = (value: TextCycleStage) => {
    setChosenStage(value);
    setOptional(false);
  };
  const weakSpot = weakSpots.find((item) => item.id === sourceWeakSpotId);
  const related = weakSpots.filter(
    (item) =>
      !item.resolved &&
      lesson.exercises.some(
        (source) => source.id === item.sourceId || source.metadata?.lessonSourceId === item.sourceId,
      ),
  );
  const [confirm, setConfirm] = useState(false);
  const [resolveMessage, setResolveMessage] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const canResolve = !!weakSpot && canResolveTransfer(weakSpot.id, weakSpot.lastSeenAt, attempts);
  async function resolve() {
    const database = db;
    const isCurrent = () => mounted.current && database === db;
    if (!weakSpot || !confirm) return;
    try {
      await database.transaction('rw', database.weakSpots, database.learningAttempts, async () => {
        if (!isCurrent()) throw new Error('Account changed');
        const current = await database.weakSpots.get(weakSpot.id);
        const evidence = await database.learningAttempts.where('lessonId').equals(lesson.id).toArray();
        if (!current || !canResolveTransfer(current.id, current.lastSeenAt, evidence)) throw new Error('No evidence');
        if (!isCurrent()) throw new Error('Account changed');
        await database.weakSpots.update(current.id, { resolved: true });
        if (!isCurrent()) throw new Error('Account changed');
      });
      if (!isCurrent()) return;
      setResolveMessage(
        zh ? '已按你的确认标记解决；练习证据仍保留。' : 'Resolved by your confirmation. Practice evidence is retained.',
      );
    } catch {
      if (!isCurrent()) return;
      setResolveMessage(
        zh ? '暂时无法解决，请重试并确认有新练习记录。' : 'Could not resolve. Retry after completing new practice.',
      );
    }
  }
  return (
    <section aria-label={zh ? '理解与表达' : 'Understand and express'} className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-[var(--font-poppins)] text-xl font-semibold text-indigo-950">
          {zh ? `${progress.completedSteps} / 5 阶段已练习` : `${progress.completedSteps} / 5 stages practiced`}
        </h2>
        <p className="text-sm text-slate-600">
          {zh ? '自评练习记录，不是掌握认证。' : 'Self-reviewed practice, not certified mastery.'}
        </p>
        <nav aria-label={zh ? '学习闭环' : 'Learning cycle'} className="flex flex-wrap gap-2">
          {stages.map((value, index) => (
            <button
              key={value}
              type="button"
              aria-current={!optional && stage === value ? 'step' : undefined}
              className={`${button} ${!optional && stage === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => choose(value)}
            >
              {index + 1}. {labels[value]}
              {progress.stages[value] && (
                <span aria-hidden="true" className="ml-1">
                  ✓
                </span>
              )}
            </button>
          ))}
        </nav>
        {(optional || stage !== progress.nextStage) && (
          <button type="button" className={`${button} text-indigo-700`} onClick={() => choose(progress.nextStage)}>
            {zh ? '下一步：' : 'Next: '}
            {labels[progress.nextStage]}
          </button>
        )}
      </div>
      {related.length > 0 && !weakSpot && (
        <div className="flex flex-wrap gap-2">
          {related.map((item) => (
            <Link
              key={item.id}
              className={`${button} bg-amber-50 text-amber-900`}
              href={`/learn/${encodeURIComponent(lesson.unitId)}?lesson=${encodeURIComponent(lesson.id)}&weakSpot=${encodeURIComponent(item.id)}`}
            >
              {zh ? '针对练习：' : 'Target practice: '}
              {item.text}
            </Link>
          ))}
        </div>
      )}
      {weakSpot && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-semibold">
            {zh ? '针对薄弱项' : 'Targeted weak spot'}: {weakSpot.text}
          </h3>
          <p>
            {zh
              ? '先提交一次针对练习，再修改重试，最后在个人例句中换语境使用。仅在你确认进步后标记解决；不是 AI 掌握认证。'
              : 'Submit targeted practice, revise and retry, then use it in a new context in Your example. Resolve only after your own review; this is not AI-certified mastery.'}
          </p>
          {weakSpot.resolved ? (
            <p>{zh ? '已标记解决' : 'Marked resolved'}</p>
          ) : (
            <>
              <label className="my-2 flex gap-2">
                <input
                  type="checkbox"
                  checked={confirm}
                  disabled={!canResolve}
                  onChange={(event) => setConfirm(event.target.checked)}
                />
                {zh
                  ? '我已对照重试和新例句，确认这个问题已改善'
                  : 'I reviewed my retry and new example and confirm improvement'}
              </label>
              <button
                type="button"
                disabled={!canResolve || !confirm}
                onClick={() => void resolve()}
                className={`${button} bg-white text-amber-950`}
              >
                {zh ? '确认解决' : 'Confirm resolved'}
              </button>
            </>
          )}
          {resolveMessage && <p role="status">{resolveMessage}</p>}
        </div>
      )}
      {!optional && (stage === 'recall' || stage === 'apply') ? (
        <TextCyclePractice
          key={JSON.stringify([db.name, lesson.id, source, stage, progress.referenceAttemptId, weakSpot?.id])}
          lesson={lesson}
          stage={stage}
          zh={zh}
          attempts={attempts}
          now={Math.max(now, Date.now())}
          sourceWeakSpotId={weakSpot?.id}
        />
      ) : (
        <WorkshopActivity
          key={JSON.stringify([db.name, lesson.id, source, activeActivity, weakSpot?.id])}
          lesson={lesson}
          activity={activeActivity}
          zh={zh}
          correcting={!optional && stage === 'correct'}
          sourceWeakSpotId={weakSpot?.id}
        />
      )}
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm text-indigo-700">
          {zh ? '按需专项练习' : 'Optional focused practice'}
        </summary>
        <div className="flex flex-wrap gap-2">
          {LEARNING_ACTIVITIES.map((value, i) => (
            <button
              type="button"
              key={value}
              aria-pressed={activity === value}
              className={`${button} ${activity === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => {
                setActivity(value);
                setOptional(true);
              }}
            >
              {i + 1}.{' '}
              {
                {
                  comprehension: zh ? '阅读理解' : 'Comprehension',
                  writing: zh ? '自主写作' : 'Writing',
                  retelling: zh ? '复述' : 'Retelling',
                  'personal-example': zh ? '个人例句' : 'Your example',
                  'sentence-pronunciation': zh ? '句子发音' : 'Sentence practice',
                }[value]
              }
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

function WorkshopActivity({
  lesson,
  activity,
  zh,
  sourceWeakSpotId,
  correcting = false,
}: {
  lesson: Lesson;
  activity: LearningActivity;
  zh: boolean;
  sourceWeakSpotId?: string;
  correcting?: boolean;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const source = lesson.exercises.map((item) => item.text).join('\n\n');
  const showTranslation = usePracticeTranslationStore((state) => state.visibility.read);
  const targetLang = useTTSStore((state) => state.targetLang);
  const translations = useTranslation(source, targetLang, { visible: showTranslation, shouldPrefetch: false });
  const usedTranslation = useRef(false);
  useEffect(() => {
    if (showTranslation) usedTranslation.current = true;
  }, [showTranslation]);
  const attempts = useLiveQuery(() => db.learningAttempts.where('lessonId').equals(lesson.id).toArray(), [lesson.id]);
  const history = (attempts ?? [])
    .filter((item) => item.activity === activity)
    .sort((a, b) => b.createdAt - a.createdAt);
  const [answer, setAnswer] = useState('');
  const [quote, setQuote] = useState('');
  const [notes, setNotes] = useState('');
  const [parent, setParent] = useState<string>();
  const cycle = deriveTextCycle(lesson.id, source, attempts ?? [], Date.now());
  // An earlier or copied root cannot satisfy Output. Keep its text and evidence,
  // but let the next original response start an eligible chain.
  const needsFreshOutput = activity === 'writing' && !correcting && cycle.stages.understand && !cycle.stages.output;
  const submissionParent = needsFreshOutput ? undefined : parent;
  const [feedback, setFeedback] = useState<LearningAttempt['feedback']>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [blob, setBlob] = useState<Blob>();
  const [audioUrl, setAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const draftDatabase = db.name;
  const draftKey = `${draftDatabase}:${lesson.id}:${activity}:${sourceWeakSpotId ?? ''}`;
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const oral = activity === 'retelling' || activity === 'sentence-pronunciation';
  useEffect(() => {
    try {
      const result = loadWorkshopDraft(
        { databaseName: draftDatabase, lessonId: lesson.id, activity, source, sourceWeakSpotId },
        localStorage,
        sessionStorage,
      );
      setDraftError(result.error ?? '');
      if (result.draft) {
        const draft = result.draft;
        setAnswer(typeof draft.answer === 'string' ? draft.answer : '');
        setQuote(typeof draft.quote === 'string' ? draft.quote : '');
        setNotes(typeof draft.notes === 'string' ? draft.notes : '');
        setParent(typeof draft.parent === 'string' ? draft.parent : undefined);
        usedTranslation.current = usedTranslation.current || !!draft.usedTranslation;
      }
    } catch {
      setDraftError('Draft storage unavailable. Keep this page open until your response is submitted.');
    }
    setDraftReady(true);
  }, [draftKey, draftDatabase, lesson.id, activity, sourceWeakSpotId, source]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      const result = saveWorkshopDraft(
        { databaseName: draftDatabase, lessonId: lesson.id, activity, source, sourceWeakSpotId },
        { answer, quote, notes, parent, usedTranslation: usedTranslation.current },
        localStorage,
      );
      setDraftError(result.error ?? '');
    } catch {
      setDraftError('Draft storage unavailable. Keep this page open until your response is submitted.');
    }
  }, [
    draftReady,
    draftKey,
    draftDatabase,
    lesson.id,
    activity,
    sourceWeakSpotId,
    source,
    answer,
    quote,
    notes,
    parent,
    showTranslation,
  ]);
  useEffect(() => {
    if (!correcting || !draftReady || parent || !attempts) return;
    const latest = attempts
      .filter((item) => item.activity === 'writing' && !item.cycle && item.sourceText === source)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (latest) {
      setParent(latest.id);
      setAnswer(latest.answer);
      setNotes(latest.feedback.notes);
    }
  }, [correcting, draftReady, parent, attempts, source]);
  useEffect(() => {
    mounted.current = true;
    const interruptRecording = () => {
      if (document.hidden && recorder.current?.state === 'recording') recorder.current.stop();
    };
    document.addEventListener('visibilitychange', interruptRecording);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', interruptRecording);
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      abort.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  async function startRecording() {
    setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      rec.onstop = () => {
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        media.getTracks().forEach((track) => track.stop());
        if (mounted.current) {
          setRecording(false);
          setBlob(new Blob(chunks, { type: rec.mimeType }));
        }
      };
      rec.start();
      recordingTimer.current = setTimeout(() => {
        if (rec.state === 'recording') rec.stop();
      }, 120000);
      setRecording(true);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      setMessage(
        t(
          'Microphone unavailable. Allow permission or attach an audio recording below.',
          '麦克风不可用，请允许权限，或在下方选择已有录音。',
        ),
      );
    }
  }
  async function save() {
    const database = db;
    const isCurrent = () => mounted.current && db === database;
    const valid = validateLearningResponse(activity, source, answer, quote, blob?.size ? 'pending' : undefined);
    if (valid) {
      setMessage(
        valid === 'quote'
          ? t('Quote a passage exactly as it appears above.', '请填写上方原文中真实存在的依据。')
          : valid === 'recording'
            ? t('Record or attach audio first.', '请先录制或上传音频。')
            : t('Write your response first.', '请先填写回答。'),
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const attempt = createLearningAttempt({
        lessonId: lesson.id,
        unitId: lesson.unitId,
        activity,
        sourceText: source,
        sourceContentIds: lesson.exercises.map((item) => item.metadata?.lessonSourceId ?? item.id),
        sourceWeakSpotId,
        answer,
        evidenceQuote: quote,
        parentAttemptId: submissionParent,
        notes,
        feedback,
      });
      attempt.usedTranslation = usedTranslation.current;
      if (correcting) {
        const correctionError = validateTextCorrection(attempt, attempts ?? []);
        if (correctionError) {
          setMessage(
            t(
              'Revise your earlier answer and describe the improvement before saving.',
              '请修改已有回答，并填写具体改进点后保存。',
            ),
          );
          return;
        }
      }
      await persistLearningAttempt(database, attempt, blob, isCurrent);
      if (isCurrent()) {
        setParent(attempt.id);
        setMessage(
          t(
            'Saved. Review your feedback, make one change, then submit a revision. Every version is retained.',
            '已保存。对照反馈修改一处，再提交修改稿；每个版本都将保留。',
          ),
        );
      }
    } catch {
      if (isCurrent())
        setMessage(t('Save failed. Your response is still here; retry.', '保存失败，当前输入仍保留，请重试。'));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  async function review() {
    const database = db;
    const isCurrent = () => mounted.current && db === database;
    if (!answer.trim()) return;
    setBusy(true);
    setMessage('');
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const config = useProviderStore.getState();
      const response = await fetch('/api/learning/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          source,
          answer,
          activity,
          quote,
          language: zh ? 'zh' : 'en',
          provider: config.activeProviderId,
          providerConfigs: config.providers,
        }),
      });
      if (!response.ok) throw new Error('feedback unavailable');
      const result = await response.json();
      if (isCurrent()) setFeedback({ source: 'ai', notes: result.feedback, checklist: [], provider: result.provider });
    } catch {
      if (isCurrent())
        setMessage(
          t(
            'AI feedback unavailable. Your work is preserved. Retry or use the self-review checklist.',
            'AI 反馈暂不可用，内容未丢失。可重试或使用自评清单。',
          ),
        );
    } finally {
      clearTimeout(timeout);
      if (isCurrent()) setBusy(false);
    }
  }
  const updateAnswer = (value: string) => {
    setAnswer(value);
    setFeedback(undefined);
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {draftError && (
        <p role="alert" className="mb-3 text-sm text-amber-800">
          {t(
            'Draft could not be saved on this device. Keep this page open and submit your response; your current input is still here.',
            '本机草稿保存失败，请保留页面并提交回答；当前输入仍在。',
          )}
        </p>
      )}
      {correcting && (
        <div className="mb-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
          <h3 className="font-semibold">{t('Before → after', '修改前 → 修改后')}</h3>
          <p>
            {t(
              'Use feedback to make one specific improvement. Your earlier version stays intact.',
              '根据反馈作出一处具体改进，原版本会完整保留。',
            )}
          </p>
          {parent && <p className="mt-2 whitespace-pre-wrap">{attempts?.find((item) => item.id === parent)?.answer}</p>}
          {!parent && <p>{t('Save an initial response in Output first.', '请先在「输出」阶段保存第一稿。')}</p>}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{activityPrompt(activity, zh)}</h3>
      {lesson.exercises
        .filter((item) => item.metadata?.importJobId && item.metadata?.sourceBlockId)
        .map((item) => (
          <Link
            key={item.id}
            href={`/library/import?job=${encodeURIComponent(item.metadata!.importJobId!)}&block=${encodeURIComponent(item.metadata!.sourceBlockId!)}`}
            className="inline-flex min-h-11 items-center text-sm text-indigo-700"
          >
            {t('Locate source passage', '定位原文段落')}
          </Link>
        ))}
      <details open={activity !== 'retelling'} className="my-4 rounded-xl bg-slate-50 p-4">
        <summary className="min-h-10 cursor-pointer text-sm font-medium text-indigo-700">
          {t('Source material · show / hide', '原文 · 展开 / 隐藏')}
        </summary>
        <TranslationBar module="read" />
        <div className="max-h-64 overflow-y-auto text-base leading-7 text-slate-800">
          <ReadAloudContent
            text={source}
            showTranslation={showTranslation}
            sentenceTranslations={alignPracticeTranslations(source, translations.sentenceTranslations)}
          />
          {showTranslation && translations.isLoading && <p className="text-sm">{t('Translating…', '翻译中…')}</p>}
          {showTranslation && translations.error && (
            <button type="button" className={button} onClick={translations.retry}>
              {t('Translation unavailable. Retry', '翻译暂不可用，重试')}
            </button>
          )}
        </div>
      </details>
      <label className="block text-sm font-medium text-slate-700">
        {oral
          ? t('Summary / sentence and stress notes', '复述摘要 / 练习句与重音标记')
          : t('Your response', '你的回答')}
        <textarea
          value={answer}
          disabled={busy}
          onChange={(event) => updateAnswer(event.target.value)}
          className="mt-2 min-h-36 w-full rounded-xl bg-slate-50 p-3 text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </label>
      {activity === 'comprehension' && (
        <label className="mt-3 block text-sm font-medium text-slate-700">
          {t('Exact supporting quote from the source', '支持回答的原文引用')}
          <textarea
            value={quote}
            disabled={busy}
            onChange={(event) => {
              setQuote(event.target.value);
              setFeedback(undefined);
            }}
            className="mt-2 min-h-20 w-full rounded-xl bg-slate-50 p-3 text-base"
          />
        </label>
      )}
      {oral && (
        <div className="my-4 space-y-3">
          <button
            type="button"
            className={`${button} bg-indigo-50 text-indigo-700`}
            onClick={() => (recording ? recorder.current?.stop() : void startRecording())}
          >
            {recording ? t('Stop recording', '停止录音') : t('Record / retry', '录音 / 重录')}
          </button>
          <label className="block text-sm text-slate-700">
            {t('Or attach a recording (up to 25 MB)', '或上传录音（最大 25 MB）')}
            <input
              type="file"
              accept="audio/*"
              disabled={recording}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 25 * 1024 * 1024 || !file.type.startsWith('audio/')) {
                  setMessage(t('Choose an audio file up to 25 MB.', '请选择不超过 25 MB 的音频。'));
                  return;
                }
                setBlob(file);
              }}
              className="mt-2 block max-w-full text-sm"
            />
          </label>
          {audioUrl && <audio controls src={audioUrl} className="max-w-full" />}
          <p className="text-xs text-slate-600">
            {t(
              'Up to 2 minutes; stops when backgrounded. Save before switching activities. Listen back and compare; no acoustic score is inferred from recording or text.',
              '最长 2 分钟，进入后台会停止。切换练习前请保存录音。回听并对照原文；录音或文字不等同于专业声学评分。',
            )}
          </p>
        </div>
      )}
      <fieldset className="my-4 space-y-2 rounded-xl bg-slate-50 p-4">
        <legend className="text-sm font-medium">
          {t('Self-review (not an automatic score)', '自评清单（不是自动评分）')}
        </legend>
        <p className="text-sm text-slate-600">
          {t(
            'Did I cover the main point? Is my evidence or new context clear? What is one change for my next attempt?',
            '是否表达了主旨？依据或新情境是否清楚？下一稿准备改进什么？',
          )}
        </p>
        <label className="block text-sm">
          {t('My next improvement', '下次改进点')}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 min-h-20 w-full rounded-lg bg-white p-3 text-base"
          />
        </label>
      </fieldset>
      {feedback && (
        <div className="my-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          <h4 className="font-semibold text-indigo-700">
            {t('AI suggestions — verify against your intent', 'AI 建议 — 请核对是否符合本意')}
          </h4>
          {feedback.notes}
        </div>
      )}
      <p className="mb-2 text-xs text-slate-500">
        {t(
          'AI review sends this source and response to your configured provider. Audio stays local. Optional; may use provider credits.',
          'AI 反馈会将本课原文和回答发给配置的服务商，不发送录音。可选功能，可能消耗服务商额度。',
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${button} bg-slate-100 text-slate-700`}
          disabled={busy || !answer.trim() || recording}
          onClick={() => void review()}
        >
          {t('Get AI feedback', '获取 AI 反馈')}
        </button>
        <button
          type="button"
          className={`${button} bg-indigo-600 text-white`}
          disabled={busy || recording}
          onClick={() => void save()}
        >
          {busy
            ? t('Working…', '处理中…')
            : submissionParent
              ? t('Save revision', '保存修改稿')
              : t('Save response', '保存回答')}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-indigo-700">
          {message}
        </p>
      )}
      <details className="mt-6">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-slate-700">
          {t('Submission history', '提交历史')} ({history.length})
        </summary>
        <ol className="space-y-4">
          {history.map((item) => (
            <li key={item.id} className="border-t border-slate-100 py-3 text-sm">
              <p className="text-xs text-slate-500">
                {new Date(item.createdAt).toLocaleString()} ·{' '}
                {item.feedback.source === 'ai' ? 'AI' : t('Self-review', '自评')}
              </p>
              {item.usedTranslation && (
                <p className="text-xs text-slate-500">{t('Translation assistance used', '使用过翻译辅助')}</p>
              )}
              <p className="my-2 whitespace-pre-wrap text-slate-800">{item.answer}</p>
              <p className="whitespace-pre-wrap text-slate-600">{item.feedback.notes}</p>
              {item.recordingId && <SavedRecording id={item.recordingId} zh={zh} />}
              <button
                type="button"
                className={`${button} text-indigo-700`}
                disabled={busy || recording}
                onClick={() => {
                  setAnswer(item.answer);
                  setQuote(item.evidenceQuote ?? '');
                  setParent(item.id);
                  setNotes('');
                  setFeedback(undefined);
                  setBlob(undefined);
                  setAudioUrl('');
                }}
              >
                {t('Revise this version', '修改此版本')}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function SavedRecording({ id, zh }: { id: string; zh: boolean }) {
  const record = useLiveQuery(() => db.mediaBlobs.get(id), [id]);
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!record) return;
    const next = URL.createObjectURL(record.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [record]);
  return url ? (
    <audio controls src={url} className="my-2 max-w-full" />
  ) : (
    <p className="text-xs text-slate-500">
      {zh ? '录音在另一设备或尚未恢复。' : 'Recording is on another device or not restored yet.'}
    </p>
  );
}
