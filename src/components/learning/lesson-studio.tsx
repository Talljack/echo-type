'use client';

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Keyboard,
  Loader2,
  Mic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Square,
  StepForward,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMediaUrl } from '@/hooks/use-media-url';
import { useSentenceRecognizer } from '@/hooks/use-sentence-recognizer';
import { PLAYBACK_RATES, type PlayerBackend, useTranscriptPlayer } from '@/hooks/use-transcript-player';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { type DictationResult, diffDictation } from '@/lib/dictation-diff';
import { formatClock, type LessonSegment, segmentsForLesson } from '@/lib/lesson-segments';
import { buildSpeechWordFeedback, calculateSpeechMatch } from '@/lib/speech-feedback';
import {
  EMPTY_PROGRESS,
  itemCoverage,
  loadStudioProgress,
  type StudioProgress,
  type StudioSkill,
  saveStudioProgress,
} from '@/lib/studio-progress';
import { cn } from '@/lib/utils';
import { upsertWeakSpot } from '@/lib/weak-spots';
import { extractYouTubeVideoId } from '@/lib/youtube-transcript';
import type { ContentItem, TypingSession } from '@/types/content';
import type { Lesson } from '@/types/learning-unit';

type StudioMode = 'listen' | 'dictation' | 'shadow';

const MODE_SKILL: Record<StudioMode, StudioSkill> = { listen: 'listen', dictation: 'write', shadow: 'speak' };
const SESSION_MODULE: Record<StudioSkill, TypingSession['module']> = {
  listen: 'listen',
  write: 'write',
  speak: 'speak',
};

function isVideo(item: ContentItem) {
  return (
    item.metadata?.materialType === 'video' ||
    item.metadata?.mediaKind === 'video' ||
    /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(item.metadata?.sourceFilename ?? '')
  );
}

function youTubeIdFor(item: ContentItem): string | undefined {
  const url = item.metadata?.sourceUrl;
  if (!url) return undefined;
  try {
    return extractYouTubeVideoId(url) ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── Small UI pieces ────────────────────────────────────────────────────────

function IconButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 [&>svg]:size-[18px]',
        active ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

function DiffView({ result }: { result: DictationResult }) {
  return (
    <p className="font-reading text-[19px] leading-[2.1]">
      {result.tokens.map((token, index) => {
        const key = `${index}-${token.text}`;
        if (token.accuracy === 'correct')
          return (
            <span key={key} className="text-ink">
              {token.text}{' '}
            </span>
          );
        if (token.accuracy === 'extra')
          return (
            <span key={key} className="text-ink-4 line-through decoration-danger/60">
              {token.text}{' '}
            </span>
          );
        if (token.accuracy === 'missing')
          return (
            <span key={key} className="rounded-md bg-danger-soft px-1 text-danger-ink">
              {token.text}{' '}
            </span>
          );
        return (
          <span key={key} className="relative inline-block">
            {token.typed && (
              <span className="absolute -top-4 left-0 whitespace-nowrap font-sans text-[11px] text-ink-4 line-through">
                {token.typed}
              </span>
            )}
            <span
              className={cn(
                'rounded-md px-1',
                token.accuracy === 'close' ? 'bg-warning-soft text-warning-ink' : 'bg-danger-soft text-danger-ink',
              )}
            >
              {token.text}
            </span>{' '}
          </span>
        );
      })}
    </p>
  );
}

// ─── Studio ────────────────────────────────────────────────────────────────

export function LessonStudio({ lesson, zh }: { lesson: Lesson; zh: boolean }) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const segments = useMemo(() => segmentsForLesson(lesson.exercises), [lesson.exercises]);
  const primary = lesson.exercises[0];
  const mediaUrl = useMediaUrl(primary?.metadata?.audioUrl);
  const youtubeId = primary ? youTubeIdFor(primary) : undefined;
  const timed = segments.length > 0 && segments.every((segment) => segment.start !== undefined);
  const [mediaFailed, setMediaFailed] = useState(false);
  const preferred: PlayerBackend =
    timed && youtubeId && !mediaUrl ? 'youtube' : timed && primary?.metadata?.audioUrl ? 'media' : 'tts';
  const backend: PlayerBackend = mediaFailed ? 'tts' : preferred;
  const video = backend === 'youtube' || (backend === 'media' && primary ? isVideo(primary) : false);

  const [mode, setMode] = useState<StudioMode>('listen');
  const [hideText, setHideText] = useState(false);
  const [progress, setProgress] = useState<StudioProgress>(EMPTY_PROGRESS);
  const [saveError, setSaveError] = useState('');
  const scope = db.name;
  const savedSkills = useRef(new Set<string>());

  useEffect(() => {
    setProgress(loadStudioProgress(scope, lesson.id));
    savedSkills.current = new Set();
  }, [scope, lesson.id]);

  const updateProgress = useCallback(
    (update: (current: StudioProgress) => StudioProgress) => {
      setProgress((current) => {
        const next = update(current);
        saveStudioProgress(scope, lesson.id, next);
        return next;
      });
    },
    [scope, lesson.id],
  );

  const onSegmentHeard = useCallback(
    (index: number) => {
      const segment = segments[index];
      if (!segment) return;
      updateProgress((current) =>
        current.heard.includes(segment.id) ? current : { ...current, heard: [...current.heard, segment.id] },
      );
    },
    [segments, updateProgress],
  );

  const player = useTranscriptPlayer({ backend, segments, youtubeId, onSegmentHeard });

  useEffect(() => {
    if (player.error) setMediaFailed(true);
  }, [player.error]);

  // Save one aggregated practice session per exercise and skill once all its segments are done,
  // so lesson drills, the daily plan and spaced review all see the work.
  useEffect(() => {
    for (const item of lesson.exercises) {
      for (const skill of ['listen', 'write', 'speak'] as const) {
        const key = `${item.id}:${skill}`;
        if (savedSkills.current.has(key)) continue;
        const coverage = itemCoverage(progress, segments, item.id, skill);
        if (!coverage.complete) continue;
        savedSkills.current.add(key);
        const words = item.text.split(/\s+/).filter(Boolean).length;
        const scored = skill !== 'listen';
        const now = Date.now();
        void savePracticeSession(
          {
            id: nanoid(),
            contentId: item.id,
            module: SESSION_MODULE[skill],
            startTime: now - Math.max(60, coverage.total * 20) * 1000,
            endTime: now,
            totalChars: item.text.length,
            correctChars: scored ? Math.round((item.text.length * coverage.average) / 100) : 0,
            wrongChars: scored ? item.text.length - Math.round((item.text.length * coverage.average) / 100) : 0,
            totalWords: words,
            wpm: 0,
            accuracy: scored ? coverage.average : 0,
            completed: true,
          },
          { content: item },
        ).catch(() => {
          savedSkills.current.delete(key);
          setSaveError(
            zh ? '练习保存失败，下次会自动重试。' : 'Could not save your practice. It will retry next time.',
          );
        });
      }
    }
  }, [progress, segments, lesson.exercises, zh]);

  // Space: play/pause · ←/→: previous/next sentence (ignored while typing or on a focused control).
  const { toggle, prev, next } = player;
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return;
      if (event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, prev, next]);

  // Auto-scroll the active sentence into view in listen mode.
  const rowRefs = useRef(new Map<number, HTMLElement>());
  useEffect(() => {
    if (mode !== 'listen' || player.activeIndex < 0) return;
    rowRefs.current.get(player.activeIndex)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [mode, player.activeIndex]);

  const skillCount = (skill: StudioSkill) =>
    skill === 'listen'
      ? progress.heard.filter((id) => segments.some((segment) => segment.id === id)).length
      : segments.filter(
          (segment) => (skill === 'write' ? progress.dictation : progress.shadow)[segment.id] !== undefined,
        ).length;

  const modes: { id: StudioMode; label: string; icon: typeof Headphones; tone: string; activeTone: string }[] = [
    {
      id: 'listen',
      label: t('Listen', '精听'),
      icon: Headphones,
      tone: 'text-listen-ink',
      activeTone: 'bg-listen text-on-fill',
    },
    {
      id: 'dictation',
      label: t('Dictation', '听写'),
      icon: Keyboard,
      tone: 'text-write-ink',
      activeTone: 'bg-write text-on-fill',
    },
    {
      id: 'shadow',
      label: t('Shadow', '跟读'),
      icon: Mic,
      tone: 'text-speak-ink',
      activeTone: 'bg-speak text-on-fill',
    },
  ];

  if (!segments.length)
    return (
      <p className="rounded-2xl bg-surface-2 p-5 text-sm text-ink-3">
        {t('This lesson has no text to practise yet.', '这节课还没有可练习的文本。')}
      </p>
    );

  const switchMode = (next: StudioMode) => {
    player.pause();
    setMode(next);
  };

  return (
    <section
      aria-label={t('Lesson studio', '课程练习室')}
      className="card-paper overflow-hidden"
      data-testid="lesson-studio"
    >
      {/* Media */}
      {video && (
        <div className="bg-black">
          {backend === 'youtube' ? (
            <div ref={player.youtubeHostRef} className="mx-auto aspect-video max-h-[52vh] w-full" />
          ) : (
            <video
              ref={player.mediaRef}
              src={mediaUrl ?? undefined}
              playsInline
              preload="metadata"
              className="mx-auto aspect-video max-h-[52vh] w-full"
              aria-label={t('Lesson video', '课程视频')}
            >
              <track kind="captions" />
            </video>
          )}
        </div>
      )}
      {!video && backend === 'media' && (
        <audio ref={player.mediaRef} src={mediaUrl ?? undefined} preload="metadata" className="hidden">
          <track kind="captions" />
        </audio>
      )}

      {/* Mode switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div
          role="tablist"
          aria-label={t('Practice mode', '练习方式')}
          className="flex gap-1 rounded-xl bg-surface-2 p-1"
        >
          {modes.map((item) => {
            const active = mode === item.id;
            const done = skillCount(MODE_SKILL[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(item.id)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                  active ? item.activeTone : `${item.tone} hover:bg-surface`,
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                <span className={cn('text-xs tabular-nums', active ? 'text-white/75' : 'text-ink-4')}>
                  {done}/{segments.length}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-3">
          {backend === 'tts'
            ? mediaFailed
              ? t('Original media unavailable — using a synthetic voice.', '原媒体不可用，已改用合成语音。')
              : t('Synthetic voice', '合成语音朗读')
            : backend === 'youtube'
              ? t('Original video · YouTube', '原视频 · YouTube')
              : video
                ? t('Original video', '原视频')
                : t('Original recording', '原声录音')}
        </p>
      </div>

      {mode === 'listen' && (
        <ListenView
          segments={segments}
          player={player}
          timed={timed}
          hideText={hideText}
          heard={progress.heard}
          rowRefs={rowRefs.current}
          zh={zh}
        />
      )}
      {mode === 'dictation' && (
        <DictationView
          key={lesson.id}
          segments={segments}
          player={player}
          scores={progress.dictation}
          zh={zh}
          lesson={lesson}
          onScore={(segment, accuracy) =>
            updateProgress((current) => ({
              ...current,
              dictation: { ...current.dictation, [segment.id]: Math.max(current.dictation[segment.id] ?? 0, accuracy) },
            }))
          }
        />
      )}
      {mode === 'shadow' && (
        <ShadowView
          key={lesson.id}
          segments={segments}
          player={player}
          scores={progress.shadow}
          zh={zh}
          lesson={lesson}
          onScore={(segment, accuracy) =>
            updateProgress((current) => ({
              ...current,
              shadow: { ...current.shadow, [segment.id]: Math.max(current.shadow[segment.id] ?? 0, accuracy) },
            }))
          }
        />
      )}

      {/* Transport */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <IconButton label={t('Previous sentence', '上一句')} onClick={player.prev} disabled={player.activeIndex <= 0}>
          <ChevronLeft />
        </IconButton>
        <button
          type="button"
          onClick={player.toggle}
          disabled={!player.ready}
          aria-label={player.playing ? t('Pause', '暂停') : t('Play', '播放')}
          className="inline-flex size-11 items-center justify-center rounded-full bg-brand text-on-brand shadow-sm transition-colors hover:bg-brand-strong disabled:opacity-50"
        >
          {!player.ready ? (
            <Loader2 className="size-5 animate-spin" />
          ) : player.playing ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 translate-x-px fill-current" />
          )}
        </button>
        <IconButton
          label={t('Next sentence', '下一句')}
          onClick={player.next}
          disabled={player.activeIndex >= segments.length - 1}
        >
          <ChevronRight />
        </IconButton>
        <IconButton
          label={t('Replay this sentence', '重播本句')}
          onClick={() => player.playSegment(Math.max(0, player.activeIndex))}
        >
          <RotateCcw />
        </IconButton>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
        <IconButton
          label={player.loop ? t('Loop sentence: on', '单句循环：开') : t('Loop sentence: off', '单句循环：关')}
          active={player.loop}
          onClick={() => player.setLoop(!player.loop)}
        >
          {player.loop ? <Repeat1 /> : <Repeat />}
        </IconButton>
        {mode === 'listen' && (
          <>
            <IconButton
              label={
                player.pauseAfterEach
                  ? t('Pause after each sentence: on', '逐句暂停：开')
                  : t('Pause after each sentence: off', '逐句暂停：关')
              }
              active={player.pauseAfterEach}
              onClick={() => player.setPauseAfterEach(!player.pauseAfterEach)}
            >
              <StepForward />
            </IconButton>
            <IconButton
              label={hideText ? t('Show text', '显示文本') : t('Hide text (blind listening)', '隐藏文本（盲听）')}
              active={hideText}
              onClick={() => setHideText((value) => !value)}
            >
              {hideText ? <EyeOff /> : <Eye />}
            </IconButton>
          </>
        )}
        <div
          className="ml-auto flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5"
          role="group"
          aria-label={t('Speed', '语速')}
        >
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              aria-pressed={player.rate === rate}
              onClick={() => player.setRate(rate)}
              className={cn(
                'h-7 rounded-md px-2 text-xs font-semibold tabular-nums transition-colors',
                player.rate === rate ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink',
              )}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>
      {saveError && (
        <p role="alert" className="border-t border-line bg-danger-soft px-4 py-2 text-sm text-danger-ink">
          {saveError}
        </p>
      )}
    </section>
  );
}

type Player = ReturnType<typeof useTranscriptPlayer>;

// ─── Listen ────────────────────────────────────────────────────────────────

function ListenView({
  segments,
  player,
  timed,
  hideText,
  heard,
  rowRefs,
  zh,
}: {
  segments: LessonSegment[];
  player: Player;
  timed: boolean;
  hideText: boolean;
  heard: string[];
  rowRefs: Map<number, HTMLElement>;
  zh: boolean;
}) {
  const heardSet = useMemo(() => new Set(heard), [heard]);
  const t = (en: string, cn: string) => (zh ? cn : en);
  return (
    <div className="scrollbar-thin max-h-[58vh] overflow-y-auto px-2 py-3 sm:px-3">
      <p className="px-3 pb-2 text-xs text-ink-4">
        {t(
          'Click a sentence to play from there. Use loop or pause-after-each to study line by line.',
          '点击句子从该处播放；打开单句循环或逐句暂停，逐句精听。',
        )}
      </p>
      <ol className="space-y-0.5">
        {segments.map((segment) => {
          const active = segment.index === player.activeIndex;
          const done = heardSet.has(segment.id);
          return (
            <li
              key={segment.id}
              ref={(element) => {
                if (element) rowRefs.set(segment.index, element);
                else rowRefs.delete(segment.index);
              }}
            >
              <button
                type="button"
                onClick={() => player.playFrom(segment.index)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                  active ? 'bg-highlight-soft' : 'hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'mt-[7px] w-10 shrink-0 text-right font-sans text-[11px] tabular-nums',
                    active ? 'font-semibold text-ink-2' : 'text-ink-4',
                  )}
                >
                  {timed ? formatClock(segment.start) : segment.index + 1}
                </span>
                <span
                  className={cn(
                    'font-reading text-[17px] leading-relaxed transition-[filter,color]',
                    active ? 'text-ink' : 'text-ink-2',
                    hideText && 'select-none blur-[5px] group-hover:blur-0 group-focus-visible:blur-0',
                  )}
                >
                  {segment.text}
                </span>
                {done && <Check className="mt-[7px] size-3.5 shrink-0 text-success" aria-label={t('Heard', '已听')} />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Shared single-sentence frame ──────────────────────────────────────────

function useSentenceCursor(segments: LessonSegment[], scores: Record<string, number>, player: Player) {
  const [index, setIndex] = useState(() => {
    const firstOpen = segments.findIndex((segment) => scores[segment.id] === undefined);
    return firstOpen < 0 ? 0 : firstOpen;
  });
  const segment = segments[Math.min(index, segments.length - 1)];
  const { select } = player;
  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), segments.length - 1);
      setIndex(clamped);
      select(clamped);
    },
    [segments.length, select],
  );
  // Start the shared transport on this view's sentence…
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    select(index);
  }, []);
  // …and follow it when the transport's previous/next buttons move it.
  const lastActive = useRef(player.activeIndex);
  useEffect(() => {
    if (player.activeIndex === lastActive.current) return;
    lastActive.current = player.activeIndex;
    if (player.activeIndex >= 0) setIndex(player.activeIndex);
  }, [player.activeIndex]);
  return { index, segment, go };
}

function SentenceHeader({
  index,
  total,
  score,
  zh,
  onPrev,
  onNext,
}: {
  index: number;
  total: number;
  score?: number;
  zh: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">
        {t('Sentence', '第')} {index + 1} {t(`of ${total}`, `/ ${total} 句`)}
      </p>
      <div className="flex items-center gap-1">
        {score !== undefined && (
          <span
            className={cn(
              'mr-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              score >= 90
                ? 'bg-success-soft text-success-ink'
                : score >= 60
                  ? 'bg-warning-soft text-warning-ink'
                  : 'bg-danger-soft text-danger-ink',
            )}
          >
            {t('Best', '最佳')} {score}%
          </span>
        )}
        <IconButton label={t('Previous sentence', '上一句')} onClick={onPrev} disabled={index === 0}>
          <ChevronLeft />
        </IconButton>
        <IconButton label={t('Next sentence', '下一句')} onClick={onNext} disabled={index >= total - 1}>
          <ChevronRight />
        </IconButton>
      </div>
    </div>
  );
}

// ─── Dictation ─────────────────────────────────────────────────────────────

function DictationView({
  segments,
  player,
  scores,
  zh,
  lesson,
  onScore,
}: {
  segments: LessonSegment[];
  player: Player;
  scores: Record<string, number>;
  zh: boolean;
  lesson: Lesson;
  onScore: (segment: LessonSegment, accuracy: number) => void;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const { index, segment, go } = useSentenceCursor(segments, scores, player);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DictationResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoplayed = useRef<string | null>(null);

  // Fresh sentence: clear and auto-play once.
  useEffect(() => {
    setAnswer('');
    setResult(null);
    setRevealed(false);
    inputRef.current?.focus();
    if (player.ready && autoplayed.current !== segment.id) {
      autoplayed.current = segment.id;
      player.playSegment(segment.index);
    }
  }, [segment.id, segment.index, player.ready, player.playSegment]);

  const check = () => {
    if (!answer.trim()) return;
    const next = diffDictation(segment.text, answer);
    setResult(next);
    onScore(segment, next.accuracy);
    if (next.accuracy < 60)
      void upsertWeakSpot({
        module: 'listen',
        weakSpotType: 'dictation-sentence',
        sourceId: segment.itemId,
        sourceType: 'content',
        text: segment.text,
        reason: zh ? `听写准确率 ${next.accuracy}%` : `Dictation accuracy ${next.accuracy}%`,
        targetHref: `/learn/${encodeURIComponent(lesson.unitId)}?lesson=${encodeURIComponent(lesson.id)}`,
        accuracy: next.accuracy,
      }).catch(() => undefined);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (result) go(index + 1);
    else check();
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      <SentenceHeader
        index={index}
        total={segments.length}
        score={scores[segment.id]}
        zh={zh}
        onPrev={() => go(index - 1)}
        onNext={() => go(index + 1)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => player.playSegment(segment.index)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-write-soft px-4 text-sm font-semibold text-write-ink transition-colors hover:bg-write-soft/70"
        >
          <Play className="size-4 fill-current" />
          {player.soloIndex === segment.index ? t('Playing…', '播放中…') : t('Play sentence', '播放本句')}
        </button>
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {revealed ? t('Hide answer', '隐藏答案') : t('Peek', '偷看答案')}
        </button>
      </div>
      {revealed && !result && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 font-reading text-[17px] text-ink-2">{segment.text}</p>
      )}
      <label className="block">
        <span className="sr-only">{t('Type what you hear', '写下你听到的内容')}</span>
        <input
          ref={inputRef}
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
            if (result) setResult(null);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t('Type what you hear…', '写下你听到的内容…')}
          className="h-14 w-full rounded-xl border border-line-strong bg-surface px-4 font-mono text-[17px] text-ink shadow-xs outline-none transition-[border-color,box-shadow] focus:border-write focus:ring-[3px] focus:ring-write/15"
        />
      </label>
      {result ? (
        <div className="space-y-4 rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-5" role="status">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              {result.perfect
                ? t('Perfect — every word is right.', '完美，每个词都对了。')
                : t(
                    `${result.correct} of ${result.total} words right`,
                    `${result.total} 个词中对了 ${result.correct} 个`,
                  )}
            </p>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
                result.accuracy >= 90
                  ? 'bg-success-soft text-success-ink'
                  : result.accuracy >= 60
                    ? 'bg-warning-soft text-warning-ink'
                    : 'bg-danger-soft text-danger-ink',
              )}
            >
              {result.accuracy}%
            </span>
          </div>
          <DiffView result={result} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                inputRef.current?.focus();
                player.playSegment(segment.index);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              <RotateCcw className="size-4" />
              {t('Try again', '再试一次')}
            </button>
            {index < segments.length - 1 && (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong"
              >
                {t('Next sentence', '下一句')}
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-4">
            {t('Enter to check · case and punctuation don’t count', '回车检查 · 不计大小写和标点')}
          </p>
          <button
            type="button"
            onClick={check}
            disabled={!answer.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            <Check className="size-4" />
            {t('Check', '检查')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shadowing ─────────────────────────────────────────────────────────────

function ShadowView({
  segments,
  player,
  scores,
  zh,
  lesson,
  onScore,
}: {
  segments: LessonSegment[];
  player: Player;
  scores: Record<string, number>;
  zh: boolean;
  lesson: Lesson;
  onScore: (segment: LessonSegment, accuracy: number) => void;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const { index, segment, go } = useSentenceCursor(segments, scores, player);
  const [result, setResult] = useState<{ transcript: string; accuracy: number } | null>(null);
  const segmentRef = useRef(segment);
  segmentRef.current = segment;

  const recognizer = useSentenceRecognizer({
    zh,
    onResult: (transcript) => {
      const current = segmentRef.current;
      const { accuracy } = calculateSpeechMatch(current.text, transcript);
      setResult({ transcript, accuracy });
      onScore(current, accuracy);
      if (accuracy < 60)
        void upsertWeakSpot({
          module: 'speak',
          weakSpotType: 'reading-phrase',
          sourceId: current.itemId,
          sourceType: 'content',
          text: current.text,
          reason: zh ? `跟读匹配度 ${accuracy}%` : `Shadowing match ${accuracy}%`,
          targetHref: `/learn/${encodeURIComponent(lesson.unitId)}?lesson=${encodeURIComponent(lesson.id)}`,
          accuracy,
        }).catch(() => undefined);
    },
  });

  const { cancel } = recognizer;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the sentence changes
  useEffect(() => {
    setResult(null);
    cancel();
  }, [segment.id]);

  const feedback = result ? buildSpeechWordFeedback(segment.text, result.transcript, false) : null;
  const listening = recognizer.status === 'listening';
  const processing = recognizer.status === 'processing';

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      <SentenceHeader
        index={index}
        total={segments.length}
        score={scores[segment.id]}
        zh={zh}
        onPrev={() => go(index - 1)}
        onNext={() => go(index + 1)}
      />
      <p className="font-reading text-[22px] leading-[1.7] text-ink">
        {feedback
          ? feedback.map((word, position) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: words can repeat within a sentence
                key={position}
                title={'hint' in word ? word.hint : undefined}
                className={cn(
                  'rounded-md px-0.5',
                  word.accuracy === 'correct' && 'text-success-ink',
                  word.accuracy === 'close' && 'bg-warning-soft text-warning-ink',
                  (word.accuracy === 'wrong' || word.accuracy === 'missing') && 'bg-danger-soft text-danger-ink',
                  word.accuracy === 'extra' && 'text-ink-4 line-through',
                )}
              >
                {word.word}{' '}
              </span>
            ))
          : segment.text}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => player.playSegment(segment.index)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-listen-soft px-4 text-sm font-semibold text-listen-ink transition-colors hover:bg-listen-soft/70"
        >
          <Headphones className="size-4" />
          {t('Hear it', '先听一遍')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (listening) recognizer.stop();
            else {
              player.pause();
              setResult(null);
              recognizer.start();
            }
          }}
          disabled={processing || !recognizer.supported}
          className={cn(
            'relative inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50',
            listening ? 'bg-danger hover:bg-danger/90' : 'bg-speak hover:bg-speak/90',
          )}
        >
          {listening && (
            <span className="absolute inset-0 animate-echo-ring rounded-xl ring-2 ring-speak" aria-hidden="true" />
          )}
          {processing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : listening ? (
            <Square className="size-4 fill-current" />
          ) : (
            <Mic className="size-4" />
          )}
          {processing ? t('Checking…', '识别中…') : listening ? t('Stop', '停止') : t('Say it', '跟读本句')}
        </button>
        {result && index < segments.length - 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong"
          >
            {t('Next sentence', '下一句')}
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
      {listening && recognizer.transcript && (
        <p className="text-sm italic text-ink-3" aria-live="polite">
          “{recognizer.transcript}”
        </p>
      )}
      {result && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2/70 px-4 py-3 text-sm">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 font-semibold tabular-nums',
              result.accuracy >= 90
                ? 'bg-success-soft text-success-ink'
                : result.accuracy >= 60
                  ? 'bg-warning-soft text-warning-ink'
                  : 'bg-danger-soft text-danger-ink',
            )}
          >
            {result.accuracy}%
          </span>
          <span className="text-ink-3">
            {t('We heard:', '识别结果：')} <span className="text-ink-2">“{result.transcript}”</span>
          </span>
        </div>
      )}
      {recognizer.error && (
        <p role="alert" className="text-sm text-danger-ink">
          {recognizer.error}
        </p>
      )}
      <p className="text-xs text-ink-4">
        {recognizer.usingFallback
          ? t(
              'Your browser has no speech recognition, so the recording is sent to your speech-to-text provider.',
              '当前浏览器不支持语音识别，录音会发送到你配置的语音转写服务。',
            )
          : t(
              'Listen, then say the sentence at the same pace. Recognition runs in your browser.',
              '先听，再以相同节奏说出这句话。语音识别在浏览器中进行。',
            )}
      </p>
    </div>
  );
}
