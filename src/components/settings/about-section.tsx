'use client';

import { AlertCircle, CheckCircle2, ExternalLink, Info, Loader2, RefreshCw, Zap } from 'lucide-react';
import { Section } from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { IS_TAURI } from '@/lib/tauri';
import { APP_VERSION } from '@/lib/version';
import { useUpdaterStore } from '@/stores/updater-store';

function UpdateButton() {
  const { messages } = useI18n('settings');
  const status = useUpdaterStore((state) => state.status);
  const error = useUpdaterStore((state) => state.error);
  const newVersion = useUpdaterStore((state) => state.newVersion);
  const { checkForUpdate, openDialog } = useUpdaterStore();

  if (!IS_TAURI) return null;

  if (status === 'checking') {
    return (
      <Button variant="outline" disabled className="w-full gap-2 text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {messages.about.checkingForUpdates}
      </Button>
    );
  }

  if (status === 'available' || status === 'downloading' || status === 'downloaded') {
    return (
      <Button className="w-full cursor-pointer gap-2 bg-brand text-sm hover:bg-brand-strong" onClick={openDialog}>
        <RefreshCw className="h-3.5 w-3.5" />
        {messages.about.updateToVersion.replace('{{version}}', newVersion ?? '')}
      </Button>
    );
  }

  if (status === 'up-to-date') {
    return (
      <Button variant="outline" className="w-full cursor-pointer gap-2 text-sm" onClick={() => void checkForUpdate()}>
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        {messages.about.upToDate}
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <Button variant="outline" className="w-full cursor-pointer gap-2 text-sm" onClick={() => void checkForUpdate()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {messages.about.retryCheck}
        </Button>
        <p className="truncate text-center text-xs text-danger" title={error}>
          {messages.about.updateCheckFailed}
        </p>
      </div>
    );
  }

  return (
    <Button variant="outline" className="w-full cursor-pointer gap-2 text-sm" onClick={() => void checkForUpdate()}>
      <RefreshCw className="h-3.5 w-3.5" />
      {messages.about.checkForUpdates}
    </Button>
  );
}

export function AboutSection() {
  const { messages } = useI18n('settings');
  const platformLabel = IS_TAURI ? 'Tauri v2' : 'Web';
  const infoRows = [
    { label: messages.about.application, value: 'EchoType' },
    { label: messages.about.version, value: `v${APP_VERSION}` },
    { label: messages.about.techStack, value: 'Next.js + React + TypeScript' },
    { label: messages.about.dataStorage, value: messages.about.localIndexedDbAndCloudSync },
    { label: messages.about.desktop, value: platformLabel },
  ];

  return (
    <Section title={messages.sections.about} icon={Info}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-surface-2 px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-brand to-violet-600 shadow-lg shadow-brand/70">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mt-1 flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink">EchoType</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/88 px-3 py-1.5 text-[11px] font-semibold text-ink-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink-3">{messages.about.appDescription}</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-line rounded-lg border border-line">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm text-ink-3">{label}</span>
              </div>
              <span className="text-sm font-medium text-ink-2">{value}</span>
            </div>
          ))}
        </div>

        <UpdateButton />

        <div className="flex items-center gap-3">
          <a href="https://github.com/Talljack/echo-type" target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full cursor-pointer gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </Button>
          </a>
          <a
            href="https://github.com/Talljack/echo-type/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full cursor-pointer gap-2 text-sm">
              <AlertCircle className="h-3.5 w-3.5" />
              {messages.about.reportBug}
            </Button>
          </a>
        </div>
      </div>
    </Section>
  );
}
