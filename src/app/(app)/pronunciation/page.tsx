'use client';

import { Mic, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  IOS_EYEBROW_CLASS,
  IOS_PAGE_CONTAINER_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOS_TINTED_SUBCARD_CLASS,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import {
  getPronunciationFamilyLabel,
  PRONUNCIATION_SOUNDS,
  type PronunciationAttemptScore,
  type PronunciationSound,
  scorePronunciationAttempt,
} from '@/lib/pronunciation-practice';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'echotype:pronunciation-practice:v1';

interface SavedPronunciationState {
  completed: string[];
  attempts: Record<string, PronunciationAttemptScore>;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

function SoundCard({
  sound,
  done,
  attempt,
  listening,
  expanded,
  onListen,
  onExampleListen,
  onRecord,
}: {
  sound: PronunciationSound;
  done: boolean;
  attempt?: PronunciationAttemptScore;
  listening: boolean;
  expanded: boolean;
  onListen: () => void;
  onExampleListen: (word: string) => void;
  onRecord: () => void;
}) {
  const isIOSNativeHost = detectIOSNativeHost();
  return (
    <div
      data-testid={`sound-card-${sound.id}`}
      className={cn(
        'rounded-[18px] border-2 bg-white p-4 text-center shadow-sm',
        isIOSNativeHost ? 'border-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.05)]' : 'border-slate-200',
      )}
    >
      <button
        type="button"
        onClick={onListen}
        aria-label={`Hear ${sound.soundText}`}
        className="mx-auto block w-full rounded-xl px-2 py-2 text-center transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        <span className="block text-4xl font-semibold leading-none text-slate-700">{sound.ipa}</span>
        <span className="mt-2 block text-sm font-semibold text-indigo-700">
          Practice /{sound.ipa}/: {sound.soundText}
        </span>
      </button>
      {sound.group === 'long-vowels' ? (
        <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
            {getPronunciationFamilyLabel(sound)}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Pattern {sound.pattern}</span>
        </div>
      ) : null}
      {expanded ? (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 px-3 py-2 text-left">
          <div>
            <div className="text-xs font-semibold text-slate-800">How to make it</div>
            <div className="mt-1 text-sm text-slate-600">{sound.tip}</div>
          </div>
          <div className="text-xs font-semibold text-slate-800">Examples</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sound.examples.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => onExampleListen(word)}
                aria-label={`Hear ${word}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mx-auto mt-4 h-2 w-full rounded-full bg-slate-200">
        <div className={cn('h-2 rounded-full bg-yellow-400', done ? 'w-full' : 'w-0')} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onListen}
          className={cn(
            'inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold',
            isIOSNativeHost
              ? 'h-10 rounded-full border border-slate-200 text-slate-700'
              : 'rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50',
          )}
        >
          <Play className="h-4 w-4" />
          Listen
        </button>
        <button
          type="button"
          onClick={onRecord}
          aria-label={`Record ${sound.ipa}`}
          className={cn(
            'inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white',
            listening ? 'bg-red-500' : isIOSNativeHost ? 'bg-emerald-600' : 'bg-green-500 hover:bg-green-600',
          )}
        >
          <Mic className="h-4 w-4" />
          Record
        </button>
      </div>
      <div className="mt-3 text-xs font-semibold text-slate-500">Browser score {attempt?.score ?? 0}</div>
      {attempt ? (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs text-slate-600">
          <div>
            <div className="font-semibold text-slate-800">Target: {sound.soundText}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Browser heard: {attempt.recognized || '-'}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Result: {attempt.label}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SoundSection({
  title,
  sounds,
  completed,
  attempts,
  listeningId,
  expanded,
  onListen,
  onExampleListen,
  onRecord,
}: {
  title: string;
  sounds: PronunciationSound[];
  completed: Set<string>;
  attempts: Record<string, PronunciationAttemptScore>;
  listeningId: string | null;
  expanded: Set<string>;
  onListen: (sound: PronunciationSound) => void;
  onExampleListen: (word: string) => void;
  onRecord: (sound: PronunciationSound) => void;
}) {
  return (
    <section
      data-testid={`pronunciation-section-${title.toLowerCase()}`}
      className={cn('space-y-4', detectIOSNativeHost() && `${IOS_SECTION_CARD_CLASS} p-4`)}
    >
      <h2 className={cn('text-2xl font-bold text-slate-800', detectIOSNativeHost() && 'text-xl text-slate-950')}>
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {sounds.map((sound) => (
          <SoundCard
            key={sound.id}
            sound={sound}
            done={completed.has(sound.id)}
            attempt={attempts[sound.id]}
            listening={listeningId === sound.id}
            expanded={expanded.has(sound.id)}
            onListen={() => onListen(sound)}
            onExampleListen={onExampleListen}
            onRecord={() => onRecord(sound)}
          />
        ))}
      </div>
    </section>
  );
}

function slugLabel(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

function LongVowelSection({
  sounds,
  completed,
  attempts,
  listeningId,
  expanded,
  onListen,
  onExampleListen,
  onRecord,
}: Omit<Parameters<typeof SoundSection>[0], 'title'>) {
  const families = ['Long A', 'Long E', 'Long I', 'Long O', 'Long U'];
  return (
    <section
      data-testid="pronunciation-section-long-vowels"
      className={cn('space-y-5', detectIOSNativeHost() && `${IOS_SECTION_CARD_CLASS} p-4`)}
    >
      <h2 className={cn('text-2xl font-bold text-slate-800', detectIOSNativeHost() && 'text-xl text-slate-950')}>
        Long Vowels
      </h2>
      {families.map((family) => {
        const familySounds = sounds.filter((sound) => getPronunciationFamilyLabel(sound) === family);
        if (familySounds.length === 0) return null;
        return (
          <div key={family} data-testid={`long-vowel-family-${slugLabel(family)}`} className="space-y-3">
            <h3 className={cn('text-lg font-bold text-indigo-800', detectIOSNativeHost() && IOS_EYEBROW_CLASS)}>
              {family}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {familySounds.map((sound) => (
                <SoundCard
                  key={sound.id}
                  sound={sound}
                  done={completed.has(sound.id)}
                  attempt={attempts[sound.id]}
                  listening={listeningId === sound.id}
                  expanded={expanded.has(sound.id)}
                  onListen={() => onListen(sound)}
                  onExampleListen={onExampleListen}
                  onRecord={() => onRecord(sound)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function PronunciationPage() {
  const isIOSNativeHost = detectIOSNativeHost();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState<Record<string, PronunciationAttemptScore>>({});
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const vowels = useMemo(() => PRONUNCIATION_SOUNDS.filter((sound) => sound.group === 'vowels'), []);
  const consonants = useMemo(() => PRONUNCIATION_SOUNDS.filter((sound) => sound.group === 'consonants'), []);
  const longVowels = useMemo(() => PRONUNCIATION_SOUNDS.filter((sound) => sound.group === 'long-vowels'), []);

  useEffect(() => {
    reportNativeQAState({
      page: 'pronunciation',
      hydrated,
      completedCount: completed.size,
      totalCount: PRONUNCIATION_SOUNDS.length,
      attemptsCount: Object.keys(attempts).length,
      listening: listeningId !== null,
      speechError: Boolean(speechError),
    });
  }, [attempts, completed.size, hydrated, listeningId, speechError]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedPronunciationState>;
        setAttempts(saved.attempts ?? {});
        setCompleted(new Set(saved.completed ?? []));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved: SavedPronunciationState = { attempts, completed: [...completed] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [attempts, completed, hydrated]);

  const listenToSound = (sound: PronunciationSound) => {
    setExpanded((current) => new Set(current).add(sound.id));
    speak(sound.soundText);
  };

  const record = (sound: PronunciationSound) => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setSpeechError('Speech recognition is unavailable in this browser.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? '';
      const result = scorePronunciationAttempt(sound.soundText, spoken);
      setAttempts((current) => ({ ...current, [sound.id]: result }));
      if (result.passed) {
        setCompleted((current) => new Set(current).add(sound.id));
      }
    };
    recognition.onerror = () => {
      setSpeechError('Recording failed. Check microphone permission and try again.');
      setListeningId(null);
    };
    recognition.onend = () => setListeningId(null);
    setSpeechError('');
    setListeningId(sound.id);
    recognition.start();
  };

  return (
    <div
      className={isIOSNativeHost ? `${IOS_PAGE_CONTAINER_CLASS} space-y-6` : 'mx-auto max-w-6xl space-y-8 px-4 py-6'}
    >
      {isIOSNativeHost ? (
        <IOSPageHeader
          icon={Volume2}
          tone="indigo"
          title="Pronunciation Practice"
          description="Practice sounds directly. Words are examples only."
          badge={`${completed.size} / ${PRONUNCIATION_SOUNDS.length}`}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Volume2 className="h-5 w-5" />
            </div>
            <h1 className="font-[var(--font-poppins)] text-3xl font-bold text-indigo-900">Pronunciation Practice</h1>
            <p className="mt-1 text-sm text-indigo-500">Practice sounds directly. Words are examples only.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <span data-testid="pronunciation-progress" className="font-semibold text-indigo-700">
              {completed.size} / {PRONUNCIATION_SOUNDS.length}
            </span>{' '}
            sounds clear
          </div>
        </div>
      )}

      {speechError ? (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm text-red-700',
            isIOSNativeHost ? `${IOS_TINTED_SUBCARD_CLASS} text-red-700` : 'border-red-200 bg-red-50',
          )}
        >
          {speechError}
        </div>
      ) : null}

      <SoundSection
        title="Vowels"
        sounds={vowels}
        completed={completed}
        attempts={attempts}
        listeningId={listeningId}
        expanded={expanded}
        onListen={listenToSound}
        onExampleListen={speak}
        onRecord={record}
      />
      <SoundSection
        title="Consonants"
        sounds={consonants}
        completed={completed}
        attempts={attempts}
        listeningId={listeningId}
        expanded={expanded}
        onListen={listenToSound}
        onExampleListen={speak}
        onRecord={record}
      />
      <LongVowelSection
        sounds={longVowels}
        completed={completed}
        attempts={attempts}
        listeningId={listeningId}
        expanded={expanded}
        onListen={listenToSound}
        onExampleListen={speak}
        onRecord={record}
      />

      <button
        type="button"
        onClick={() => {
          setCompleted(new Set());
          setAttempts({});
          setSpeechError('');
          setExpanded(new Set());
          window.localStorage.removeItem(STORAGE_KEY);
        }}
        className={cn(
          IOS_TERTIARY_BUTTON_CLASS,
          'inline-flex items-center gap-2',
          !isIOSNativeHost && 'rounded-lg border-indigo-200 px-4 py-2 text-indigo-700 hover:bg-white',
        )}
        aria-label="Reset pronunciation practice"
      >
        <RotateCcw className="h-4 w-4" />
        Reset all
      </button>
    </div>
  );
}
