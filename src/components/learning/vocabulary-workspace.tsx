'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { VOCAB_CONTROL, VocabularyPractice } from '@/components/learning/vocabulary-practice';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { db } from '@/lib/db';
import { findMorphology } from '@/lib/morphology';
import { introducedVocabularyToday, type VocabularyMode, vocabularyQueue, vocabularyRecordId } from '@/lib/vocabulary';
import { useLanguageStore } from '@/stores/language-store';

const modes: VocabularyMode[] = ['meaning', 'spelling', 'dictation', 'application', 'construction'];
export default function Page() {
  return (
    <Suspense fallback={<p>Loading vocabulary…</p>}>
      <VocabularyPage />
    </Suspense>
  );
}
function VocabularyPage() {
  const workspace = useLearningWorkspace();
  if (workspace.error)
    return (
      <p role="alert">
        {workspace.error}
        <button type="button" onClick={workspace.retry}>
          Retry
        </button>
      </p>
    );
  if (!workspace.data) return <p>Loading vocabulary…</p>;
  return <VocabularyWorkspace key={workspace.data.database.name} data={workspace.data} />;
}
export function VocabularyWorkspace({
  data,
  scopeIds,
  baseHref = '/library/vocabulary',
}: {
  data: NonNullable<ReturnType<typeof useLearningWorkspace>['data']>;
  scopeIds?: string[];
  baseHref?: string;
}) {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const query = useSearchParams();
  const router = useRouter();
  const [book, setBook] = useState(query.get('book') ?? '');
  const [mode, setMode] = useState<VocabularyMode>(
    modes.includes(query.get('mode') as VocabularyMode) ? (query.get('mode') as VocabularyMode) : 'meaning',
  );
  const [selected, setSelected] = useState(query.get('word') ?? '');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const state = useLiveQuery(
    async () => ({
      attempts: await data.database.learningAttempts.toArray(),
      settings: await data.database.dailyTasks.get('preferences:vocabulary'),
    }),
    [data.database],
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const words = data.contents.filter(
    (c) => (scopeIds ? scopeIds.includes(c.id) : c.type === 'word') && !c.deletedAt && !c.metadata?.lessonSourceId,
  );
  const groups = [
    ...new Map(
      words.map((c) => [
        c.category ?? '',
        c.metadata?.vocabulary?.bookTitle ?? c.metadata?.courseTitle ?? c.category ?? t('Ungrouped', '未分组'),
      ]),
    ).entries(),
  ];
  const available = words.filter(
    (c) =>
      (!book || c.category === book) &&
      (mode !== 'spelling' || !!c.metadata?.vocabulary?.meaning) &&
      (mode !== 'construction' || !!findMorphology(c.title)),
  );
  const limit = state?.settings?.newWordsPerDay ?? 10;
  const queue = vocabularyQueue(
    available,
    data.records,
    mode,
    limit,
    Math.max(now, Date.now()),
    introducedVocabularyToday(state?.attempts ?? [], mode, Date.now()),
  );
  const active = selected ? available.find((c) => c.id === selected) : undefined;
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started && active && state && queue.some((c) => c.id === active.id)) setStarted(true);
  }, [started, active, state, queue]);
  const canOpen = active && (started || queue.some((c) => c.id === active.id));
  const due = queue.filter((c) => data.records.some((r) => r.id === vocabularyRecordId(c.id, mode))).length;
  function changeBook(id: string) {
    setBook(id);
    setSelected('');
    setStarted(false);
    router.replace(`${baseHref}?book=${encodeURIComponent(id)}&mode=${mode}`, { scroll: false });
  }
  async function settings(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 100 || data.database !== db) return;
    try {
      const time = Date.now();
      await data.database.dailyTasks.put({
        id: 'preferences:vocabulary',
        kind: 'settings',
        sourceId: 'vocabulary',
        dateKey: '',
        originDateKey: '',
        title: 'Vocabulary preferences',
        titleZh: '背词设置',
        reason: '',
        reasonZh: '',
        href: '/library/vocabulary',
        minutes: 0,
        status: 'pending',
        createdAt: state?.settings?.createdAt ?? time,
        updatedAt: time,
        newWordsPerDay: value,
      });
    } catch {
      setError(t('Could not save preferences.', '设置未能保存。'));
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24 text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-indigo-950">{t('Vocabulary practice', '背词练习')}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            'Recall → spell → use → review. Construction hints stay with the word.',
            '回忆 → 拼写 → 运用 → 复习。构词提示与单词放在一起。',
          )}
        </p>
      </header>
      {canOpen && state ? (
        <VocabularyPractice
          key={JSON.stringify([data.database.name, active.id, mode, active.title, active.metadata?.vocabulary])}
          content={active}
          mode={mode}
          record={data.records.find((r) => r.id === vocabularyRecordId(active.id, mode))}
          zh={zh}
          onBack={() => {
            setSelected('');
            setStarted(false);
            router.replace(`${baseHref}?book=${encodeURIComponent(book)}&mode=${mode}`, { scroll: false });
          }}
        />
      ) : (
        <>
          {selected && !canOpen && (
            <p role="status">
              {t(
                'This word is not due or is unavailable in this mode. Choose another task.',
                '该词未到复习时间，或不适用于当前模式，请选择其他任务。',
              )}
            </p>
          )}
          <Link href="/library" className={`${VOCAB_CONTROL} text-indigo-700`}>
            {t('Back to learning materials', '返回学习材料')}
          </Link>
          <div className="grid gap-4 sm:grid-cols-2">
            <label hidden={!!scopeIds} className={scopeIds ? 'hidden' : 'text-sm font-medium'}>
              {t('Word book', '词书')}
              <select
                value={book}
                onChange={(e) => changeBook(e.target.value)}
                className="mt-2 block min-h-11 w-full rounded-xl bg-white p-3"
              >
                <option value="">{t('All my words', '全部单词')}</option>
                {groups
                  .filter(([id]) => id)
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              {t('Practice mode', '练习模式')}
              <select
                value={mode}
                aria-label={t('Practice mode', '练习模式')}
                onChange={(e) => {
                  setMode(e.target.value as VocabularyMode);
                  setSelected('');
                  setStarted(false);
                  router.replace(`${baseHref}?book=${encodeURIComponent(book)}&mode=${e.target.value}`, {
                    scroll: false,
                  });
                }}
                className="mt-2 block min-h-11 w-full rounded-xl bg-white p-3"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {
                      {
                        meaning: t('Recall meaning', '回忆词义'),
                        spelling: t('Spell from meaning', '看义拼写'),
                        dictation: t('Listen and spell', '听音拼写'),
                        application: t('Use in a sentence', '语境造句'),
                        construction: t('Recall word parts', '构词回忆'),
                      }[m]
                    }
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold">
              {zh
                ? `${due} 个到期复习 · ${queue.length - due} 个新词`
                : `${due} due reviews · ${queue.length - due} new words`}
            </p>
            <label className="flex flex-wrap items-center gap-3 text-sm">
              {t('Daily new words per mode', '每种模式每日新词上限')}
              <input
                aria-label={t('Daily new words per mode', '每种模式每日新词上限')}
                type="number"
                min={1}
                max={100}
                value={limit}
                disabled={!state}
                onChange={(e) => void settings(Number(e.target.value))}
                className="min-h-11 w-20 rounded-xl bg-slate-50 p-2"
              />
            </label>
            <button
              type="button"
              disabled={!state || !queue.length}
              onClick={() => {
                setSelected(queue[0].id);
                setStarted(true);
              }}
              className={`${VOCAB_CONTROL} bg-indigo-600 text-white`}
            >
              {t('Start vocabulary practice', '开始背词练习')}
            </button>
            {!queue.length && (
              <p className="text-sm text-slate-600">
                {t(
                  'No cards ready in this mode. Import a word book, choose another mode, or return when review is due. Spelling needs a definition; construction needs a verified entry.',
                  '当前模式暂无待练词条。可导入词书、切换模式，或到期后复习。看义拼写需要释义，构词回忆需要已核对的资料。',
                )}
              </p>
            )}
          </div>
          <details>
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
              {t('Browse words and recent answers', '浏览词条和最近作答')} ({available.length})
            </summary>
            <ul className="divide-y divide-slate-200">
              {available.slice(0, 100).map((c) => (
                <li key={c.id} className="py-3">
                  <span className="font-medium">{c.title}</span> · {c.metadata?.vocabulary?.meaning ?? c.text}
                </li>
              ))}
            </ul>
            {state?.attempts
              .filter(
                (a) => a.lessonId.startsWith('vocabulary:') && available.some((c) => a.sourceContentIds.includes(c.id)),
              )
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 10)
              .map((a) => (
                <div key={a.id} className="my-3 rounded-xl bg-white p-3 text-sm">
                  <p className="text-slate-500">
                    {a.prompt} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                  <p className="break-words">{a.answer}</p>
                  {a.feedback.notes && <p>{a.feedback.notes}</p>}
                </div>
              ))}
          </details>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
