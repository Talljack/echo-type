'use client';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTTS } from '@/hooks/use-tts';
import { db } from '@/lib/db';
import { findMorphology } from '@/lib/morphology';
import {
  normalizeSpelling,
  spellingMatches,
  type VocabularyMode,
  validateVocabularyApplication,
} from '@/lib/vocabulary';
import { saveVocabularySubmission } from '@/lib/vocabulary-repository';
import { loadWorkshopDraft, saveWorkshopDraft } from '@/lib/workshop-draft';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { ContentItem, LearningRecord } from '@/types/content';

export const VOCAB_CONTROL =
  'min-h-11 rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 active:scale-95 motion-reduce:transform-none';
export function VocabularyPractice({
  content,
  mode,
  record,
  zh,
  onBack,
}: {
  content: ContentItem;
  mode: VocabularyMode;
  record?: LearningRecord;
  zh: boolean;
  onBack: () => void;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const owner = useRef(db);
  const previous = useRef(record?.lastPracticed);
  const id = useRef(nanoid());
  const [answer, setAnswer] = useState('');
  const [context, setContext] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const { speak, stop, resolvedVoiceSourceReason } = useTTS();
  useEffect(() => () => stop(), [stop]);
  const details = content.metadata?.vocabulary;
  const morphology = findMorphology(content.title);
  const source = JSON.stringify([content.title, details ?? content.text]);
  const scope = useMemo(
    () => ({
      databaseName: owner.current.name,
      lessonId: content.id,
      activity: mode,
      source,
      stage: `vocabulary:${previous.current ?? 'new'}`,
    }),
    [content.id, mode, source],
  );
  useEffect(() => {
    try {
      const result = loadWorkshopDraft(scope, localStorage);
      if (result.error) setError(result.error);
      if (result.draft) {
        setAnswer(result.draft.answer);
        setContext(result.draft.context ?? '');
        setRevealed(result.draft.usedSource ?? false);
      }
    } catch {
      setError(t('Draft storage unavailable. Copy your work before leaving.', '草稿存储不可用，离开前请复制答案。'));
    }
    setReady(true);
  }, [scope]);
  useEffect(() => {
    if (!ready || saved || owner.current !== db) return;
    try {
      const result = saveWorkshopDraft(
        scope,
        { answer, context, quote: '', notes: '', usedSource: revealed },
        localStorage,
      );
      if (result.error) setError(result.error);
    } catch {
      setError('Draft could not be saved / 草稿未能保存');
    }
  }, [answer, context, revealed, ready, saved, scope]);
  const exact =
    mode === 'construction'
      ? normalizeSpelling(answer).replace(/\s/g, '') === morphology?.parts.map((p) => p.form).join('+')
      : mode === 'spelling' || mode === 'dictation'
        ? spellingMatches(answer, content.title)
        : answer !== '[not recalled]';
  async function rate(rating: number) {
    if (busy || saved) return;
    setBusy(true);
    setError('');
    try {
      await saveVocabularySubmission(
        {
          id: id.current,
          contentId: content.id,
          mode,
          answer,
          context,
          revealed,
          rating,
          expectedReview: previous.current,
        },
        owner.current,
      );
      const next = await owner.current.records.get(`vocabulary:${mode}:${content.id}`);
      if (owner.current !== db) return;
      setSaved(new Date(next?.nextReview ?? Date.now()).toLocaleString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  async function favorite() {
    if (owner.current !== db) return;
    setBusy(true);
    try {
      await useFavoriteStore.getState().addFavorite({
        text: content.title,
        translation: details?.meaning ?? '',
        type: 'word',
        folderId: 'default',
        sourceContentId: content.id,
        sourceModule: 'library',
        context: details?.example ?? content.text,
        targetLang: 'zh',
        pronunciation: details?.pronunciation,
      });
      if (owner.current === db) setNote(t('Saved to my notes.', '已加入我的笔记。'));
    } catch {
      setError(t('Could not save the note.', '收藏失败，请重试。'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4" aria-label={t('Vocabulary exercise', '单词练习')}>
      <button type="button" className={`${VOCAB_CONTROL} text-indigo-700`} onClick={onBack}>
        {t('Back to word book', '返回词书')}
      </button>
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          {mode === 'meaning'
            ? t('Recall the meaning before revealing.', '先回忆词义，再揭晓。')
            : mode === 'spelling'
              ? t('Type the word from its definition.', '根据释义拼写单词。')
              : mode === 'dictation'
                ? t('Listen, then type the word.', '听发音，写出单词。')
                : mode === 'construction'
                  ? t('Recall its meaningful parts, separated by +.', '回忆有意义的构词部分，用 + 分隔。')
                  : t('Use this word in your own new situation.', '在自己的新情境中用这个词造句。')}
        </p>
        <h2 className="break-words text-3xl font-semibold text-indigo-950">
          {mode === 'spelling'
            ? details?.meaning
            : mode === 'dictation'
              ? t('Listen to the word', '听单词发音')
              : content.title}
        </h2>
        {(mode === 'dictation' || mode === 'meaning' || revealed) && (
          <button
            type="button"
            onClick={() =>
              void speak(content.title).catch(() =>
                setError(t('Audio unavailable. Check your voice settings.', '发音不可用，请检查语音设置。')),
              )
            }
            className={`${VOCAB_CONTROL} bg-indigo-50 text-indigo-700`}
          >
            {t('Play pronunciation', '播放发音')}
          </button>
        )}
        {mode === 'dictation' && resolvedVoiceSourceReason && (
          <p className="text-xs text-slate-500">{resolvedVoiceSourceReason}</p>
        )}
        {mode === 'application' && (
          <label className="block text-sm font-medium">
            {t('New situation', '新语境')}
            <input
              aria-label={t('New situation', '新语境')}
              disabled={!ready || revealed}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={1000}
              className="mt-2 block w-full rounded-xl bg-slate-50 p-3"
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          {t('Your answer', '你的答案')}
          <textarea
            aria-label={t('Your answer', '你的答案')}
            disabled={!ready || revealed}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={5000}
            rows={3}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 block w-full resize-y rounded-xl bg-slate-50 p-3 text-base disabled:text-slate-700"
          />
        </label>
        {!revealed ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!ready || !answer.trim() || (mode === 'application' && !context.trim())}
              onClick={() => {
                const issue =
                  mode === 'application'
                    ? validateVocabularyApplication(content.title, answer, context, details?.example ?? content.text)
                    : null;
                if (issue) {
                  setError(issue);
                  return;
                }
                setError('');
                setRevealed(true);
              }}
              className={`${VOCAB_CONTROL} bg-indigo-600 text-white`}
            >
              {t('Compare answer', '核对答案')}
            </button>
            <button
              type="button"
              disabled={!ready || mode === 'application'}
              onClick={() => {
                setAnswer('[not recalled]');
                setRevealed(true);
              }}
              className={`${VOCAB_CONTROL} text-slate-700`}
            >
              {t("I don't know yet", '暂时想不起来')}
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl bg-indigo-50 p-4">
            <p className="text-xl font-semibold">
              {content.title} <span className="text-sm font-normal">{details?.pronunciation}</span>
            </p>
            <p>
              {details?.meaning ?? t('Reference context (not a dictionary definition):', '参考语境（非词典释义）：')}
            </p>
            <p className="text-sm text-slate-600">{details?.example || content.text}</p>
            {morphology ? (
              <details open={mode === 'construction'}>
                <summary className="min-h-11 cursor-pointer font-medium">{t('Word construction', '构词记忆')}</summary>
                <p className="font-mono text-lg">{morphology.parts.map((p) => p.form).join(' + ')}</p>
                <ul className="my-2 space-y-1 text-sm">
                  {morphology.parts.map((p) => (
                    <li key={p.form}>
                      {p.form} ·{' '}
                      {zh ? { prefix: '前缀', root: '词根', base: '基础词', suffix: '后缀' }[p.kind] : p.kind} ·{' '}
                      {p.meaning}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  {t('Word family: ', '同族词：')}
                  {morphology.family.join(', ')}
                </p>
                <a
                  href={morphology.source}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-sm text-indigo-700 underline"
                >
                  {t('Construction reference', '构词资料来源')}
                </a>
                <p className="text-xs text-slate-600">
                  {t(
                    'Teaching decomposition, not exhaustive historical etymology. Meaning still depends on context.',
                    '这是教学用构词拆解，并非完整历史词源；实际词义仍需结合语境。',
                  )}
                </p>
              </details>
            ) : (
              <p className="text-xs text-slate-600">
                {t('No verified construction entry for this word yet.', '该词暂无核对过的构词资料，不做猜测拆解。')}
              </p>
            )}
            <p className="text-sm">
              {exact
                ? t(
                    'Compare and rate honestly. Meaning and usage are self-reviewed, not AI-certified.',
                    '请对照后如实评分。词义和用法为自评，不是 AI 掌握认证。',
                  )
                : t('Not recalled correctly. This card will be scheduled again.', '本次未正确回忆，将安排再次复习。')}
            </p>
            {!saved && (
              <div className="flex flex-wrap gap-2">
                {[
                  [1, 'Again', '重学'],
                  [2, 'Hard', '困难'],
                  [3, 'Good', '良好'],
                  [4, 'Easy', '轻松'],
                ].map(([rating, en, cn]) => (
                  <button
                    type="button"
                    key={rating}
                    disabled={busy || (!exact && Number(rating) > 1)}
                    onClick={() => void rate(Number(rating))}
                    className={`${VOCAB_CONTROL} bg-white text-indigo-800`}
                  >
                    {zh ? cn : en}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={busy || !!note}
              onClick={() => void favorite()}
              className={`${VOCAB_CONTROL} text-indigo-700`}
            >
              {t('Save to my notes', '加入我的笔记')}
            </button>
            {note && <p role="status">{note}</p>}
          </div>
        )}
        {saved && (
          <p role="status" className="text-green-700">
            {t('Saved. Next review:', '已保存，下次复习：')} {saved}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
