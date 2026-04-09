'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, Headphones, Mic, PenLine } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { playModuleCompleteSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';
import {
  type ModuleStatus,
  SHADOW_MODULES,
  type ShadowModule,
  useShadowReadingStore,
} from '@/stores/shadow-reading-store';

const MODULE_CONFIG: Record<ShadowModule | 'speak', { icon: typeof Headphones; path: string }> = {
  listen: { icon: Headphones, path: '/listen' },
  read: { icon: BookOpen, path: '/read' },
  write: { icon: PenLine, path: '/write' },
  speak: { icon: Mic, path: '/speak' },
};

function StepConnector({ status, animate }: { status: ModuleStatus; animate?: boolean }) {
  return (
    <div className="flex-1 h-0.5 mx-1 relative overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-colors',
          status === 'completed' ? 'bg-green-400' : 'bg-slate-200',
        )}
      />
      {animate && status === 'completed' && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-300"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

function CompletedCheckmark({ justCompleted }: { justCompleted: boolean }) {
  if (justCompleted) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
      >
        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      </motion.div>
    );
  }
  return <Check className="w-3.5 h-3.5" />;
}

interface ShadowReadingProgressBarProps {
  contentId: string;
  currentModule: ShadowModule;
  showSpeakHint?: boolean;
  speakHref?: string;
}

export function ShadowReadingProgressBar({
  contentId,
  currentModule,
  showSpeakHint,
  speakHref,
}: ShadowReadingProgressBarProps) {
  const session = useShadowReadingStore((s) => s.session);
  const getNextIncompleteModule = useShadowReadingStore((s) => s.getNextIncompleteModule);
  const { messages } = useI18n('shadowReading');
  const pbMessages = messages.progressBar;

  const pathname = usePathname();
  const [justCompletedModule, setJustCompletedModule] = useState<ShadowModule | null>(null);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const prevProgressRef = useRef<Record<ShadowModule, ModuleStatus> | null>(null);

  useEffect(() => {
    setShowNextPrompt(false);
  }, [pathname]);

  useEffect(() => {
    if (!session) {
      prevProgressRef.current = null;
      return;
    }

    const prev = prevProgressRef.current;
    prevProgressRef.current = { ...session.moduleProgress };

    if (!prev) return;

    for (const mod of SHADOW_MODULES) {
      if (prev[mod] !== 'completed' && session.moduleProgress[mod] === 'completed') {
        setJustCompletedModule(mod);
        playModuleCompleteSound();
        const nextMod = getNextIncompleteModule();
        if (nextMod) {
          setShowNextPrompt(true);
        }
        const timer = setTimeout(() => {
          setJustCompletedModule(null);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [session, getNextIncompleteModule]);

  if (!session || session.contentId !== contentId) return null;

  const moduleLabels: Record<ShadowModule | 'speak', string> = {
    listen: pbMessages.listen,
    read: pbMessages.read,
    write: pbMessages.write,
    speak: pbMessages.speakOptional,
  };

  const completedCount = SHADOW_MODULES.filter((m) => session.moduleProgress[m] === 'completed').length;
  const progressPercent = Math.round((completedCount / SHADOW_MODULES.length) * 100);
  const nextModule = getNextIncompleteModule();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-sm relative">
        {SHADOW_MODULES.map((mod, index) => {
          const status = session.moduleProgress[mod];
          const { icon: Icon, path } = MODULE_CONFIG[mod];
          const label = moduleLabels[mod];
          const isCurrent = mod === currentModule;
          const isJustCompleted = justCompletedModule === mod;

          const stepContent = (
            <motion.div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                isCurrent && status !== 'completed' && 'bg-indigo-100 text-indigo-700',
                status === 'completed' && 'text-green-600',
                !isCurrent && status !== 'completed' && 'text-slate-400',
                !isCurrent && 'hover:text-indigo-600 hover:bg-indigo-50/50',
              )}
              animate={isJustCompleted ? { scale: [1, 1.2, 1] } : undefined}
              transition={{ duration: 0.4 }}
            >
              {status === 'completed' ? (
                <CompletedCheckmark justCompleted={isJustCompleted} />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{label}</span>
            </motion.div>
          );

          return (
            <div key={mod} className="flex items-center">
              {index > 0 && (
                <StepConnector
                  status={SHADOW_MODULES[index - 1] ? session.moduleProgress[SHADOW_MODULES[index - 1]] : 'pending'}
                  animate={justCompletedModule === SHADOW_MODULES[index - 1]}
                />
              )}
              {isCurrent ? (
                stepContent
              ) : (
                <Link href={`${path}/${contentId}`} title={pbMessages.practiceIn.replace('{{module}}', label)}>
                  {stepContent}
                </Link>
              )}
            </div>
          );
        })}

        {showSpeakHint && speakHref && (
          <>
            <StepConnector status="pending" />
            <Link
              href={speakHref}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-indigo-400 transition-colors border border-dashed border-slate-200 hover:border-indigo-200"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{moduleLabels.speak}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-200 text-slate-400">
                {pbMessages.optional}
              </Badge>
            </Link>
          </>
        )}

        <div className="ml-2 text-[10px] text-slate-400 font-medium tabular-nums">{progressPercent}%</div>
      </div>

      <AnimatePresence>
        {showNextPrompt && nextModule && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              href={`${MODULE_CONFIG[nextModule].path}/${contentId}`}
              onClick={() => setShowNextPrompt(false)}
              className="flex items-center justify-between gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-xs font-medium text-indigo-700">
                  {pbMessages.moduleCompleted.replace('{{module}}', moduleLabels[justCompletedModule ?? currentModule])}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-indigo-600 hover:text-indigo-800 gap-1 px-2"
              >
                {pbMessages.continueToNext.replace('{{module}}', moduleLabels[nextModule])}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
