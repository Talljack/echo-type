'use client';

import { AlertCircle, ArrowDownCircle, Loader2, RotateCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import enUpdater from '@/lib/i18n/messages/updater/en.json';
import zhUpdater from '@/lib/i18n/messages/updater/zh.json';
import { useLanguageStore } from '@/stores/language-store';
import { useUpdaterStore } from '@/stores/updater-store';

const UPDATER_LOCALES = { en: enUpdater, zh: zhUpdater } as const;

export function UpdateDialog() {
  const t = UPDATER_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const { status, currentVersion, newVersion, changelog, downloadProgress, error, dialogOpen } = useUpdaterStore();
  const { downloadUpdate, installUpdate, dismissUpdate, closeDialog, checkForUpdate } = useUpdaterStore();

  if (status !== 'available' && status !== 'downloading' && status !== 'downloaded' && status !== 'error') {
    return null;
  }

  // Error state
  if (status === 'error') {
    return (
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {t.error.title}
            </DialogTitle>
            <DialogDescription>{t.error.description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 break-all">{error || t.error.unknown}</div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t.error.close}
            </Button>
            <Button onClick={() => void checkForUpdate()}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {t.error.retry}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Downloaded state — restart prompt
  if (status === 'downloaded') {
    return (
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t.downloaded.title}</DialogTitle>
            <DialogDescription>{t.downloaded.description.replace('{{version}}', newVersion || '')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={dismissUpdate}>
              {t.downloaded.later}
            </Button>
            <Button onClick={() => void installUpdate()}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {t.downloaded.restartNow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Available / Downloading state
  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.available.title}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="font-mono text-slate-500">v{currentVersion}</span>
              <span className="text-slate-400">&rarr;</span>
              <span className="font-mono font-medium text-indigo-600">v{newVersion}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {changelog && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t.available.whatsNew}</p>
            <div className="max-h-48 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm text-slate-700 leading-relaxed prose prose-sm prose-slate">
              <Markdown>{changelog}</Markdown>
            </div>
          </div>
        )}

        {status === 'downloading' && (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">{downloadProgress}%</p>
          </div>
        )}

        <DialogFooter>
          {status === 'available' && (
            <Button onClick={() => void downloadUpdate()}>
              <ArrowDownCircle className="w-4 h-4 mr-1.5" />
              {t.available.download}
            </Button>
          )}
          {status === 'downloading' && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              {t.available.downloading}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
