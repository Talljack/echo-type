'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Headphones, Mic, Square, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePronunciationStudio } from '@/hooks/use-pronunciation-studio';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { PRONUNCIATION_SOUNDS } from '@/lib/pronunciation-practice';
import { legacyPracticedIds, MINIMAL_PAIRS, recognitionMatches, STUDIO_SOUNDS } from '@/lib/pronunciation-training';
import { upsertWeakSpot } from '@/lib/weak-spots';
import { useLanguageStore } from '@/stores/language-store';
import { usePronunciationStore } from '@/stores/pronunciation-store';

const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50';

export function PronunciationStudio() {
  const [scope, setScope] = useState(0);
  useEffect(() => {
    const change = () => setScope((value) => value + 1);
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
  }, []);
  return <StudioWorkspace key={scope} />;
}

function StudioWorkspace() {
  const [database] = useState(() => db);
  const zh = useLanguageStore((s) => s.interfaceLanguage === 'zh');
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [soundId, setSoundId] = useState('ih');
  const [wordIndex, setWordIndex] = useState(0);
  const [pairIndex, setPairIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [persistError, setPersistError] = useState(false);
  const sound = STUDIO_SOUNDS.find((s) => s.id === soundId) ?? STUDIO_SOUNDS[0];
  const word = sound.examples[wordIndex] ?? sound.examples[0];
  const studio = usePronunciationStudio(word);
  const pair = MINIMAL_PAIRS[pairIndex];
  const settings = usePronunciationStore();
  const progress = useLiveQuery(() => database.pronunciationProgress.toArray(), [database]) ?? [];
  const savedAudio = useRef<string | null>(null);
  const savedAssessment = useRef<unknown>(null);
  const playback = useRef(0);

  useEffect(() => {
    usePronunciationStore.getState().hydrate();
    const id = new URLSearchParams(window.location.search).get('sound');
    if (id && STUDIO_SOUNDS.some((s) => s.id === id)) {
      setSoundId(id);
      const index = MINIMAL_PAIRS.findIndex((p) => p.soundId === id);
      if (index >= 0) setPairIndex(index);
    }
    try {
      const ids =
        database.name === 'echotype:anonymous'
          ? legacyPracticedIds(localStorage.getItem('echotype:pronunciation-practice:v1'))
          : [];
      void database
        .transaction('rw', database.pronunciationProgress, async () => {
          for (const soundId of ids) {
            const id = `legacy:${soundId}`;
            if (!(await database.pronunciationProgress.get(id)))
              await database.pronunciationProgress.add({ id, soundId, kind: 'legacy', updatedAt: Date.now() });
          }
        })
        .catch(() => setPersistError(true));
    } catch {
      setPersistError(true);
    }
    return () => {
      playback.current++;
      window.speechSynthesis?.cancel();
    };
  }, [database]);

  useEffect(() => {
    if (!studio.audioUrl || savedAudio.current === studio.audioUrl) return;
    savedAudio.current = studio.audioUrl;
    void database.pronunciationProgress
      .add({ id: nanoid(), soundId, kind: 'recording', updatedAt: Date.now() })
      .catch(() => setPersistError(true));
  }, [studio.audioUrl, soundId, database]);

  useEffect(() => {
    if (!studio.assessment || savedAssessment.current === studio.assessment) return;
    savedAssessment.current = studio.assessment;
    const assessment = studio.assessment;
    void (async () => {
      await database.pronunciationProgress.add({
        id: nanoid(),
        soundId,
        kind: 'speechsuper',
        assessment,
        updatedAt: Date.now(),
      });
      for (const phoneme of assessment.phonemes.filter((p) => p.score < 60)) {
        if (db !== database) return;
        await upsertWeakSpot({
          module: 'speak',
          weakSpotType: 'pronunciation-phrase',
          sourceId: soundId,
          sourceType: 'session',
          text: `${word} /${phoneme.phoneme}/`,
          reason: `SpeechSuper phoneme score: ${phoneme.score}`,
          targetHref: `/pronunciation?sound=${encodeURIComponent(soundId)}`,
          accuracy: phoneme.score,
        });
      }
    })().catch(() => setPersistError(true));
  }, [studio.assessment, soundId, word, database]);

  function speak(text: string, ready?: () => void) {
    if (!window.speechSynthesis) {
      setNotice(t('Speech playback is unsupported in this browser.', '当前浏览器不支持语音播放。'));
      return;
    }
    const token = ++playback.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;
    const british = window.speechSynthesis.getVoices().find((v) => v.lang === 'en-GB');
    if (british) utterance.voice = british;
    utterance.onend = () => {
      if (token === playback.current) ready?.();
    };
    utterance.onerror = () => {
      if (token === playback.current)
        setNotice(
          t('Audio could not play. Try again or choose another browser.', '无法播放音频，请重试或更换浏览器。'),
        );
    };
    setNotice('');
    window.speechSynthesis.speak(utterance);
  }

  function chooseSound(id: string) {
    playback.current++;
    window.speechSynthesis?.cancel();
    setSoundId(id);
    setWordIndex(0);
    window.history.replaceState(null, '', `/pronunciation?sound=${encodeURIComponent(id)}`);
  }

  function playQuiz() {
    if (choice !== null) return;
    const next = answer ?? (Math.random() < 0.5 ? 0 : 1);
    setAnswer(next);
    setAudioReady(false);
    speak(pair.words[next], () => setAudioReady(true));
  }

  async function submitChoice(selected: number) {
    if (choice !== null || answer === null || !audioReady) return;
    setChoice(selected);
    const correct = selected === answer;
    try {
      await database.pronunciationProgress.add({
        id: nanoid(),
        soundId: pair.soundId,
        kind: 'listening',
        correct,
        updatedAt: Date.now(),
      });
      if (db !== database) return;
      if (!correct)
        await upsertWeakSpot({
          module: 'listen',
          weakSpotType: 'listening-segment',
          sourceId: pair.soundId,
          sourceType: 'session',
          text: pair.words.join(' / '),
          reason: 'Minimal-pair listening needs practice',
          targetHref: `/pronunciation?sound=${pair.soundId}`,
        });
    } catch {
      setPersistError(true);
    }
  }

  const practiced = new Set(progress.map((p) => p.soundId)).size;
  const busy = studio.recording || studio.starting || studio.assessing;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 px-4 py-7 text-slate-800 sm:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          {t('Pronunciation studio', '发音练习室')}
        </p>
        <h1 className="font-[family-name:var(--font-poppins)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('Hear the difference. Find your voice.', '听清差别，练好发音。')}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {t(
            'Listen, compare, record, and replay. Recognition checks words; only acoustic assessment can report pronunciation metrics.',
            '先听辨，再录音回放。语音识别只核对词语；只有声学评估才能提供发音指标。',
          )}
        </p>
        <p className="text-xs text-slate-500">
          {t(
            `${practiced} reference entries practiced on this device · Practice history is not mastery.`,
            `本机已练习 ${practiced} 个参考条目 · 练习记录不代表掌握程度。`,
          )}
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="listen-heading">
        <div className="flex items-center gap-2 text-indigo-600">
          <Headphones size={20} />
          <h2 id="listen-heading" className="text-lg font-semibold">
            {t('1. Hear the difference', '1. 听辨差别')}
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t('Play the word, then choose what you heard.', '播放单词，然后选择你听到的词。')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MINIMAL_PAIRS.map((p, i) => (
            <button
              type="button"
              key={p.soundId}
              disabled={busy}
              aria-pressed={pairIndex === i}
              className={`${button} ${pairIndex === i ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}
              onClick={() => {
                playback.current++;
                window.speechSynthesis?.cancel();
                setPairIndex(i);
                setAnswer(null);
                setChoice(null);
                setAudioReady(false);
              }}
            >
              {p.words.join(' / ')}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className={`${button} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}
            disabled={busy || choice !== null}
            onClick={playQuiz}
          >
            <Volume2 size={18} />
            {t('Play question', '播放题目')}
          </button>
          {pair.words.map((value, i) => (
            <button
              type="button"
              key={value}
              className={button}
              disabled={!audioReady || choice !== null || busy}
              onClick={() => void submitChoice(i)}
            >
              {value}
            </button>
          ))}
        </div>
        {choice !== null && (
          <div className="mt-4 space-y-3" role="status">
            <p className="text-sm">
              {choice === answer
                ? t('Correct listening choice.', '听辨正确。')
                : t(
                    `You heard “${pair.words[answer!]}”. Compare both words and try again.`,
                    `刚才播放的是 “${pair.words[answer!]}”。对比两个词后再试一次。`,
                  )}
            </p>
            <div className="flex flex-wrap gap-2">
              {pair.words.map((value) => (
                <button type="button" className={button} key={value} disabled={busy} onClick={() => speak(value)}>
                  <Volume2 size={16} />
                  {value}
                </button>
              ))}
              <button
                type="button"
                className={button}
                onClick={() => {
                  setChoice(null);
                  setAnswer(null);
                  setAudioReady(false);
                }}
              >
                {t('Next question', '下一题')}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="chart-heading">
          <h2 id="chart-heading" className="text-lg font-semibold">
            {t('48-entry teaching chart', '48 项教学音标表')}
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {t(
              '20 vowels + 24 consonants + 4 consonant clusters. This is a common teaching convention, not 48 distinct phonemes. British reference; accents and device voices vary.',
              '20 个元音 + 24 个辅音 + 4 个辅音组合。这是常见教学分类，不代表 48 个独立音位。采用英式参考，口音与设备语音可能不同。',
            )}
          </p>
          {(['vowel', 'consonant', 'cluster'] as const).map((group) => (
            <div key={group} className="mt-5">
              <h3 className="mb-2 text-xs font-semibold text-slate-500">
                {group === 'vowel'
                  ? t('Vowels', '元音')
                  : group === 'consonant'
                    ? t('Consonants', '辅音')
                    : t('Consonant clusters', '辅音组合')}
              </h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {STUDIO_SOUNDS.filter((s) => s.group === group).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    aria-label={`/${s.ipa}/ ${s.examples[0]}`}
                    aria-pressed={sound.id === s.id}
                    disabled={busy}
                    onClick={() => chooseSound(s.id)}
                    className={`min-h-14 rounded-xl border px-1 py-2 text-lg focus-visible:outline-2 focus-visible:outline-indigo-500 ${sound.id === s.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 hover:bg-indigo-50'} disabled:opacity-60`}
                  >
                    /{s.ipa}/
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section
          className="space-y-5 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-7"
          aria-labelledby="record-heading"
        >
          <h2 id="record-heading" className="text-lg font-semibold">
            {t('2. Shape the sound', '2. 练习发音')}
          </h2>
          <div className="text-5xl font-medium text-indigo-700">/{sound.ipa}/</div>
          <p className="text-sm leading-6">{zh ? sound.tipZh : sound.tip}</p>
          <div className="flex flex-wrap gap-2">
            {sound.examples.map((example, i) => (
              <button
                type="button"
                key={example}
                className={`${button} ${word === example ? 'border-indigo-400 text-indigo-700' : ''}`}
                disabled={busy}
                aria-pressed={word === example}
                onClick={() => {
                  setWordIndex(i);
                  speak(example);
                }}
              >
                <Volume2 size={16} />
                {example}
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {t(
              'Examples use your device’s synthesized voice, not a recording of an isolated phoneme.',
              '示例使用设备合成语音，并非单独音素的真人录音。',
            )}
          </p>
          <div className="border-t border-indigo-100 pt-5">
            <h3 className="font-semibold">{t(`3. Record “${word}”`, `3. 录下 “${word}”`)}</h3>
            <p className="mt-2 text-xs text-slate-500">
              {t(
                'Up to 20 seconds. Recording stays in memory for replay.',
                '每次最多 20 秒。录音仅暂存内存，供回放使用。',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${button} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}
              disabled={studio.starting || studio.assessing}
              onClick={() => {
                window.speechSynthesis?.cancel();
                if (studio.recording) studio.stop();
                else void studio.start();
              }}
            >
              {studio.recording ? <Square size={18} /> : <Mic size={18} />}
              {studio.recording
                ? t('Stop recording', '停止录音')
                : studio.starting
                  ? t('Opening microphone…', '正在打开麦克风…')
                  : t('Record word', '录制单词')}
            </button>
          </div>
          {studio.audioUrl && (
            <audio
              className="w-full"
              controls
              src={studio.audioUrl}
              aria-label={t('Replay your recording', '回放你的录音')}
            />
          )}
          <div className="rounded-xl bg-white p-4 text-sm" aria-live="polite">
            <p className="font-medium">{t('Browser word recognition', '浏览器词语识别')}</p>
            <p className="mt-2 text-slate-600">
              {studio.transcript
                ? `“${studio.transcript}” — ${recognitionMatches(word, studio.transcript) ? t('Target word recognized', '已识别出目标词') : t('Target word not recognized', '未识别出目标词')}`
                : t('No recognized words yet.', '尚未识别到词语。')}
            </p>
            {studio.recognitionStatus && <p className="mt-2 text-xs">{studio.recognitionStatus}</p>}
            <p className="mt-2 text-xs text-slate-500">
              {t(
                'Recognition is not a pronunciation score and cannot verify a phoneme.',
                '识别结果不是发音评分，也不能验证音素。',
              )}
            </p>
          </div>
          <div className="space-y-3 border-t border-indigo-100 pt-5">
            <h3 className="font-semibold">{t('Professional acoustic assessment', '专业声学评估')}</h3>
            <p className="text-xs leading-5 text-slate-600">
              {t(
                'SpeechSuper assesses the recorded audio. Running this sends the recording to SpeechSuper using your configured account and may use paid quota.',
                'SpeechSuper 对录音进行声学评估。运行后会使用已配置的账户发送录音，可能消耗付费额度。',
              )}
            </p>
            {settings.speechSuperAppKey && settings.speechSuperSecretKey ? (
              <button
                type="button"
                className={button}
                disabled={!studio.audioUrl || busy}
                onClick={() => void studio.assess()}
              >
                {studio.assessing ? t('Assessing…', '评估中…') : t('Assess with SpeechSuper', '使用 SpeechSuper 评估')}
              </button>
            ) : (
              <Link className={button} href="/settings">
                {t('Configure SpeechSuper', '配置 SpeechSuper')}
                <ArrowRight size={16} />
              </Link>
            )}
            {studio.assessment && (
              <div className="rounded-xl bg-white p-4" aria-live="polite">
                <p className="text-xs font-medium text-indigo-700">SpeechSuper · {t('Acoustic results', '声学结果')}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      [t('Overall', '综合'), studio.assessment.overall],
                      [t('Fluency', '流利度'), studio.assessment.fluency],
                      [t('Completeness', '完整度'), studio.assessment.completeness],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-1 font-semibold">{value === undefined ? '—' : `${value}/100`}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-slate-500">{t('Provider-reported phonemes', '服务商返回的音素')}</p>
                {studio.assessment.phonemes.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {studio.assessment.phonemes.map((p, i) => (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-sm" key={`${p.phoneme}-${i}`}>
                        /{p.phoneme}/ {p.score}/100
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm">{t('No phoneme metrics returned.', '未返回音素指标。')}</p>
                )}
              </div>
            )}
          </div>
          {studio.error && (
            <p role="alert" className="text-sm text-red-700">
              {studio.error}
            </p>
          )}
        </section>
      </div>

      {notice && (
        <p role="alert" className="text-sm text-amber-800">
          {notice}
        </p>
      )}
      {persistError && (
        <p role="alert" className="text-sm text-amber-800">
          {t(
            'Practice could not be saved on this device. You can continue practicing.',
            '无法在此设备保存练习记录，你仍可继续练习。',
          )}
        </p>
      )}
      <details className="rounded-3xl border border-slate-200 bg-white p-5">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          {t(
            `Original phonics reference (${PRONUNCIATION_SOUNDS.length} entries)`,
            `原有自然拼读参考（${PRONUNCIATION_SOUNDS.length} 项）`,
          )}
        </summary>
        <p className="mb-4 text-xs leading-5 text-slate-500">
          {t(
            'Preserved separately: 39 sound references and 22 spelling patterns. Repeated vowel spellings are not additional phonemes. Earlier completion records remain unverified practice.',
            '独立保留原有的 39 个语音参考与 22 个拼写规律。重复的元音拼写不算新增音位。以往的完成记录仅作为未经验证的练习历史。',
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRONUNCIATION_SOUNDS.map((s) => (
            <div className="rounded-xl bg-slate-50 p-3 text-sm" key={s.id}>
              <p className="font-medium">
                /{s.ipa}/ {s.pattern ? `· ${s.pattern}` : ''}
              </p>
              <p className="mt-1 text-slate-600">{s.examples.join(', ')}</p>
            </div>
          ))}
        </div>
      </details>
      <p className="pb-4 text-xs leading-5 text-slate-500">
        {t(
          'Practice history is stored on this device and does not currently sync across devices. Listening errors and provider-reported low phoneme scores are added to Weak Spots; browser recognition mismatches are not.',
          '练习历史保存在此设备，暂不跨设备同步。听辨错误与服务商返回的低分音素会加入薄弱项；浏览器识别不匹配不会加入。',
        )}
      </p>
    </main>
  );
}
