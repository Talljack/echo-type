'use client';

import { ArrowUpRight, Play, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { PRONUNCIATION_GUIDE_URL, PRONUNCIATION_LESSONS } from '@/lib/pronunciation-learning';
import { IS_IOS_NATIVE_HOST, IS_TAURI } from '@/lib/tauri';
import { useLanguageStore } from '@/stores/language-store';

export function PronunciationLearning() {
  const zh = useLanguageStore((state) => state.interfaceLanguage === 'zh');
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [soundId, setSoundId] = useState('near');
  const [slow, setSlow] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const selectedPanel = useRef<HTMLElement>(null);
  const generation = useRef(0);
  const sound = PRONUNCIATION_LESSONS.find((item) => item.id === soundId) ?? PRONUNCIATION_LESSONS[0];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('sound');
    const audio = player.current;
    const initial = PRONUNCIATION_LESSONS.find((item) => item.id === requested);
    if (initial) {
      setSoundId(initial.id);
      if (audio) audio.src = initial.audioUrl;
    }
    return () => {
      generation.current++;
      audio?.pause();
    };
  }, []);

  async function play(url: string, label: string) {
    const audio = player.current;
    if (!audio) return;
    const token = ++generation.current;
    audio.pause();
    // Reassigning src discards the decoded media, even when replaying the same clip.
    if (audio.src !== new URL(url, window.location.href).href) audio.src = url;
    else audio.currentTime = 0;
    audio.playbackRate = slow ? 0.75 : 1;
    audio.preservesPitch = true;
    setError(false);
    setLoading(true);
    setPlaying(label);
    try {
      await audio.play();
    } catch (cause) {
      if (token !== generation.current || (cause instanceof DOMException && cause.name === 'AbortError')) return;
      setPlaying(null);
      setLoading(false);
      setError(true);
    }
  }

  function choose(item: typeof sound) {
    setSoundId(item.id);
    window.history.replaceState(null, '', `/pronunciation?sound=${encodeURIComponent(item.id)}`);
    void play(item.audioUrl, `/${item.ipa}/`);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() =>
        selectedPanel.current?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        }),
      );
    }
  }

  function openVideo(event: MouseEvent<HTMLAnchorElement>, url: string) {
    if (!IS_TAURI && !(IS_IOS_NATIVE_HOST && window.EchoTypeNative?.openExternal)) return;
    event.preventDefault();
    setVideoError(false);
    if (IS_TAURI) {
      void import('@tauri-apps/plugin-shell').then(({ open }) => open(url)).catch(() => setVideoError(true));
    } else {
      try {
        window.EchoTypeNative?.openExternal?.({ url });
      } catch {
        setVideoError(true);
      }
    }
  }

  const groupLabel = (group: string) =>
    group === 'vowel'
      ? t('Vowels', '元音')
      : group === 'consonant'
        ? t('Consonants', '辅音')
        : t('Consonant clusters', '辅音组合');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 pb-24 text-slate-800 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
            {t('Listen · repeat · learn', '听一听 · 跟着读')}
          </p>
          <h1 className="font-[family-name:var(--font-poppins)] text-3xl font-semibold tracking-tight text-indigo-950">
            {t('English sounds', '英语音标')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t(
              '48 sounds. Tap a symbol to listen, then try its example words.',
              '48 个音标。点击就能听发音，再用例词练一练。',
            )}
          </p>
        </div>
        <a
          href={PRONUNCIATION_GUIDE_URL}
          onClick={(event) => openVideo(event, PRONUNCIATION_GUIDE_URL)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          {t('BBC pronunciation guide', 'BBC 音标入门')} <ArrowUpRight size={16} />
        </a>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section
          className="order-1 min-w-0 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.1)] sm:p-6 lg:order-1"
          id="sound-chart"
          aria-label={t('48 sounds', '48 个音标')}
        >
          {(['vowel', 'consonant', 'cluster'] as const).map((group) => (
            <div key={group} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">{groupLabel(group)}</h2>
                <span className="text-xs tabular-nums text-slate-500">
                  {PRONUNCIATION_LESSONS.filter((item) => item.group === group).length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {PRONUNCIATION_LESSONS.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-sound-id={item.id}
                    data-testid={`sound-tile-${item.id}`}
                    aria-label={`/${item.ipa}/ ${item.examples[0].word}`}
                    aria-pressed={item.id === sound.id}
                    onClick={() => choose(item)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-3 transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${item.id === sound.id ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    <span className="text-xl font-medium">/{item.ipa}/</span>
                    <span className={`text-xs ${item.id === sound.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {item.examples[0].word}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="mt-5 text-xs leading-5 text-slate-500">
            {t(
              'British reference · 20 vowels, 24 consonants, 4 clusters.',
              '英式参考 · 20 个元音、24 个辅音、4 个辅音组合。',
            )}
          </p>
        </section>

        <section
          data-testid="selected-sound"
          ref={selectedPanel}
          className="order-2 min-w-0 scroll-mt-6 rounded-2xl bg-indigo-50 p-5 sm:p-7 lg:sticky lg:top-6 lg:order-2"
          aria-label={t('Selected sound', '当前音标')}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-indigo-600">{groupLabel(sound.group)}</span>
            <button
              type="button"
              aria-pressed={slow}
              onClick={() => {
                const next = !slow;
                setSlow(next);
                if (player.current) player.current.playbackRate = next ? 0.75 : 1;
              }}
              className="min-h-11 rounded-xl bg-white/75 px-3 text-xs font-medium text-indigo-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {slow ? t('Slow · 0.75×', '慢速 · 0.75×') : t('Normal · 1×', '正常 · 1×')}
            </button>
          </div>
          <div className="mb-5 mt-3 text-center font-[family-name:var(--font-open-sans)] text-6xl font-medium tracking-tight text-indigo-700 sm:text-7xl">
            /{sound.ipa}/
          </div>
          <button
            type="button"
            onClick={() => void play(sound.audioUrl, `/${sound.ipa}/`)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Play size={18} className="fill-current" /> {t('Play sound', '播放音标')}
          </button>
          <div className="mt-2 min-h-6 text-center text-xs text-indigo-600" aria-live="polite">
            {playing
              ? `${loading ? t('Loading audio', '正在加载音频') : t('Playing', '正在播放')} ${playing}`
              : t('Listen once, then say it out loud.', '先听一遍，再试着发出来。')}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {t('Audio could not play. Tap Play sound to try again.', '音频未能播放，请点击“播放音标”重试。')}
            </p>
          )}
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold text-indigo-950">{t('Example words', '例词')}</h2>
            <div className="space-y-2">
              {sound.examples.map((example) => (
                <button
                  key={example.word}
                  type="button"
                  aria-label={example.word}
                  onClick={() => void play(example.audioUrl, example.word)}
                  className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-indigo-500 ${playing === example.word ? 'bg-indigo-100 text-indigo-800' : 'bg-white/85 text-slate-700 hover:bg-white'}`}
                >
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-semibold">{example.word}</span>
                    <span className="text-xs text-slate-500">{example.ipa}</span>
                  </span>
                  <Volume2 size={17} className="shrink-0 text-indigo-600" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-indigo-100 pt-4">
            <p className="mb-1 text-xs font-semibold text-indigo-800">{t('Mouth tip', '口型提示')}</p>
            <p className="text-sm leading-6 text-slate-600">{zh ? sound.tipZh : sound.tip}</p>
          </div>
          <a
            data-testid="sound-video"
            href={sound.videoUrl}
            onClick={(event) => openVideo(event, sound.videoUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <span>
              {sound.hasSoundVideo
                ? t('Watch this sound on YouTube', 'YouTube 真人发音示范')
                : t('BBC pronunciation introduction', 'BBC 音标入门视频')}
            </span>
            <ArrowUpRight size={17} className="shrink-0" />
          </a>
          {videoError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {t(
                'Could not open the video. Try again or copy the link into your browser.',
                '无法打开视频，请重试或将链接复制到浏览器中。',
              )}
            </p>
          )}
          <a
            href="#sound-chart"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 lg:hidden"
          >
            {t('Choose another sound', '选择其他音标')}
          </a>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {t(
              'Bundled British synthetic samples. Videos show a real teacher’s mouth position.',
              '内置英式合成示范音频；真人口型可参考视频。',
            )}
          </p>
        </section>
      </div>
      <footer className="text-sm text-slate-500">
        <Link
          href={`/pronunciation/practice?sound=${sound.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-indigo-600 hover:text-indigo-800"
        >
          {t('Recording & listening practice', '录音与听辨练习')} <ArrowUpRight size={15} />
        </Link>
      </footer>
      {/* biome-ignore lint/a11y/useMediaCaption: The spoken IPA or word is the visible transcript above. */}
      <audio
        data-testid="sound-player"
        ref={player}
        src="/audio/pronunciation/sounds/near.mp3"
        preload="auto"
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onEnded={() => {
          if (player.current?.ended) {
            setPlaying(null);
            setLoading(false);
          }
        }}
      />
    </main>
  );
}
