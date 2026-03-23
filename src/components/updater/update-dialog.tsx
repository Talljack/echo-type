'use client';

import { AlertCircle, ArrowDownCircle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdaterStore } from '@/stores/updater-store';

export function UpdateDialog() {
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
              Update Failed
            </DialogTitle>
            <DialogDescription>Something went wrong while checking for updates.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 break-all">{error || 'Unknown error'}</div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
            <Button onClick={() => void checkForUpdate()}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Retry
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
            <DialogTitle>Restart to Apply Update?</DialogTitle>
            <DialogDescription>
              Version {newVersion} has been downloaded and is ready to install. Restart now to apply the update.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={dismissUpdate}>
              Later
            </Button>
            <Button onClick={() => void installUpdate()}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Restart Now
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
          <DialogTitle>Update Available</DialogTitle>
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">What&apos;s New</p>
            <div className="max-h-48 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {changelog}
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
              Download
            </Button>
          )}
          {status === 'downloading' && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Downloading...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
