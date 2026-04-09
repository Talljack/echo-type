'use client';

import { BookOpen, Check, Headphones, Mic, PartyPopper, PenLine, RotateCcw, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { fireConfetti } from '@/components/shared/practice-complete-banner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { playSessionCompleteSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';
import { SHADOW_MODULES, type ShadowModule, useShadowReadingStore } from '@/stores/shadow-reading-store';

type CompletionMessages = {
  durationSeconds: string;
  durationMinsSecs: string;
  durationMins: string;
  durationHoursMins: string;
  durationHours: string;
  [key: string]: string;
};

const MODULE_ICONS: Record<ShadowModule, typeof Headphones> = {
  listen: Headphones,
  read: BookOpen,
  write: PenLine,
};

const MODULE_COLORS: Record<ShadowModule, string> = {
  listen: 'bg-blue-50 text-blue-600',
  read: 'bg-emerald-50 text-emerald-600',
  write: 'bg-amber-50 text-amber-600',
};

function formatDuration(startMs: number, endMs: number, t: CompletionMessages): string {
  const diffSec = Math.floor((endMs - startMs) / 1000);
  if (diffSec < 60) return t.durationSeconds.replace('{{count}}', String(diffSec));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins < 60) {
    return secs > 0
      ? t.durationMinsSecs.replace('{{mins}}', String(mins)).replace('{{secs}}', String(secs))
      : t.durationMins.replace('{{mins}}', String(mins));
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0
    ? t.durationHoursMins.replace('{{hours}}', String(hours)).replace('{{mins}}', String(remainMins))
    : t.durationHours.replace('{{hours}}', String(hours));
}

export function ShadowReadingCompletion() {
  const session = useShadowReadingStore((s) => s.session);
  const showModal = useShadowReadingStore((s) => s.showCompletionModal);
  const dismissCompletion = useShadowReadingStore((s) => s.dismissCompletion);
  const startSession = useShadowReadingStore((s) => s.startSession);
  const { messages } = useI18n('shadowReading');
  const compMessages = messages.completion;
  const firedRef = useRef(false);

  useEffect(() => {
    if (showModal && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
      playSessionCompleteSound();
    }
    if (!showModal) {
      firedRef.current = false;
    }
  }, [showModal]);

  if (!showModal || !session) return null;

  const duration = session.completedAt
    ? formatDuration(session.startedAt, session.completedAt, compMessages as CompletionMessages)
    : '';

  const moduleLabels: Record<ShadowModule, string> = {
    listen: compMessages.listenDone,
    read: compMessages.readDone,
    write: compMessages.writeDone,
  };

  const handleRepeat = () => {
    startSession(session.contentId, session.contentTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-8 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">{compMessages.title}</h2>
          <p className="text-indigo-100 text-sm mt-1">{compMessages.subtitle}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <PartyPopper className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-slate-500">{compMessages.contentLabel}</span>
            <span className="text-slate-700 font-medium truncate">{session.contentTitle}</span>
          </div>

          {duration && (
            <p className="text-xs text-slate-400">{compMessages.timeSpent.replace('{{duration}}', duration)}</p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{compMessages.moduleSummary}</p>
            <div className="grid grid-cols-3 gap-2">
              {SHADOW_MODULES.map((mod) => {
                const Icon = MODULE_ICONS[mod];
                return (
                  <div
                    key={mod}
                    className={cn('flex flex-col items-center gap-1 rounded-lg py-2.5 px-2', MODULE_COLORS[mod])}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      <Check className="w-3 h-3 absolute -bottom-0.5 -right-1 text-green-500" strokeWidth={3} />
                    </div>
                    <span className="text-[11px] font-medium">{moduleLabels[mod]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <Link href="/library" className="block" onClick={dismissCompletion}>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
              {compMessages.startAnother}
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/listen/${session.contentId}`} onClick={handleRepeat}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {compMessages.repeatPractice}
              </Button>
            </Link>
            <Link href={`/speak/free`} onClick={dismissCompletion}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              >
                <Mic className="w-3 h-3 mr-1" />
                {compMessages.trySpeaking}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
