'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRightLeft, BookOpen, Headphones, PenLine, Repeat, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { SHADOW_MODULES, type ShadowModule, useShadowReadingStore } from '@/stores/shadow-reading-store';

const MODULE_ICONS: Record<ShadowModule, typeof Headphones> = {
  listen: Headphones,
  read: BookOpen,
  write: PenLine,
};

const MODULE_PATHS: Record<ShadowModule, string> = {
  listen: '/listen',
  read: '/read',
  write: '/write',
};

function formatElapsed(startMs: number, nowMs: number): string {
  const diffSec = Math.floor((nowMs - startMs) / 1000);
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const HIDDEN_PATHS = ['/login'];

export function ShadowReadingStatusBar() {
  const pathname = usePathname();
  const session = useShadowReadingStore((s) => s.session);
  const clearSession = useShadowReadingStore((s) => s.clearSession);
  const getCompletedCount = useShadowReadingStore((s) => s.getCompletedCount);
  const getNextIncompleteModule = useShadowReadingStore((s) => s.getNextIncompleteModule);
  const showConfirm = useShadowReadingStore((s) => s.showEndConfirm);
  const requestEndSession = useShadowReadingStore((s) => s.requestEndSession);
  const cancelEndSession = useShadowReadingStore((s) => s.cancelEndSession);
  const pendingSwitch = useShadowReadingStore((s) => s.pendingSwitch);
  const confirmSwitch = useShadowReadingStore((s) => s.confirmSwitch);
  const cancelSwitch = useShadowReadingStore((s) => s.cancelSwitch);
  const { messages } = useI18n('shadowReading');
  const sbMessages = messages.statusBar;

  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!session || session.completedAt) return;
    const update = () => setElapsed(formatElapsed(session.startedAt, Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session, session?.completedAt]);

  if (!session || HIDDEN_PATHS.includes(pathname)) return null;

  const completedCount = getCompletedCount();
  const nextModule = getNextIncompleteModule();
  const progressPercent = Math.round((completedCount / SHADOW_MODULES.length) * 100);

  const moduleLabels: Record<ShadowModule, string> = {
    listen: messages.progressBar.listen,
    read: messages.progressBar.read,
    write: messages.progressBar.write,
  };

  return (
    <>
      <div className="bg-gradient-to-r from-brand-soft to-violet-50 border-b border-line px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeInOut' }}
          >
            <Repeat className="w-4 h-4 text-brand-ink shrink-0" />
          </motion.div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-brand-ink">{sbMessages.title}</span>
            <span className="text-xs text-brand-ink truncate">{session.contentTitle}</span>

            <div className="hidden sm:flex items-center gap-1 ml-2">
              {SHADOW_MODULES.map((mod) => {
                const status = session.moduleProgress[mod];
                const Icon = MODULE_ICONS[mod];
                return (
                  <Link key={mod} href={`${MODULE_PATHS[mod]}/${session.contentId}`} title={moduleLabels[mod]}>
                    <motion.div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:ring-2 hover:ring-brand-line',
                        status === 'completed' && 'bg-success-soft text-success',
                        status === 'in_progress' && 'bg-brand-tint text-brand-ink',
                        status === 'pending' && 'bg-surface-3 text-ink-4',
                      )}
                      animate={status === 'completed' ? { scale: [1, 1.15, 1] } : undefined}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className="w-3 h-3" />
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            <span className="text-[11px] text-brand-muted ml-1 tabular-nums">
              {sbMessages.progress.replace('{{completed}}', String(completedCount))}
            </span>

            <div className="hidden sm:block w-16 h-1.5 bg-brand-tint rounded-full overflow-hidden ml-1">
              <motion.div
                className="h-full bg-brand rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            <span className="text-[10px] text-brand-muted tabular-nums ml-1">{elapsed}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {nextModule && (
              <Link href={`${MODULE_PATHS[nextModule]}/${session.contentId}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] text-brand-ink hover:text-brand-ink hover:bg-brand-tint px-2"
                >
                  {sbMessages.nextModule.replace('{{module}}', moduleLabels[nextModule])}
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-ink-4 hover:text-danger hover:bg-danger-soft transition-colors"
              onClick={requestEndSession}
              title={sbMessages.endSession}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* End Session Confirmation */}
      <Dialog
        open={showConfirm}
        onOpenChange={(open) => {
          if (!open) cancelEndSession();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-warning-soft flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <DialogTitle className="text-base">{sbMessages.endSessionConfirmTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-sm mt-2">{sbMessages.endSessionConfirmDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1.5 py-2">
            {SHADOW_MODULES.map((mod) => {
              const status = session.moduleProgress[mod];
              const Icon = MODULE_ICONS[mod];
              return (
                <div
                  key={mod}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                    status === 'completed' && 'bg-success-soft text-success-ink',
                    status === 'in_progress' && 'bg-brand-soft text-brand-ink',
                    status === 'pending' && 'bg-surface-2 text-ink-4',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{moduleLabels[mod]}</span>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={cancelEndSession}>
              {sbMessages.endSessionCancel}
            </Button>
            <Button variant="destructive" size="sm" onClick={clearSession}>
              {sbMessages.endSessionConfirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Session Confirmation */}
      <Dialog
        open={!!pendingSwitch}
        onOpenChange={(open) => {
          if (!open) cancelSwitch();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-tint flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4 text-brand-ink" />
              </div>
              <DialogTitle className="text-base">{sbMessages.switchSessionTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-sm mt-2">
              {sbMessages.switchSessionDesc.replace('{{current}}', session.contentTitle)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={cancelSwitch}>
              {sbMessages.switchSessionCancel}
            </Button>
            <Button size="sm" className="bg-brand hover:bg-brand-strong" onClick={confirmSwitch}>
              {sbMessages.switchSessionConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
