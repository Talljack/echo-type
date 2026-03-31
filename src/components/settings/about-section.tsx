'use client';

import { AlertCircle, ExternalLink, Info, Loader2, RefreshCw, Zap } from 'lucide-react';
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
      <Button className="w-full cursor-pointer gap-2 bg-indigo-600 text-sm hover:bg-indigo-700" onClick={openDialog}>
        <RefreshCw className="h-3.5 w-3.5" />
        {messages.about.updateToVersion.replace('{{version}}', newVersion ?? '')}
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
        <p className="truncate text-center text-xs text-red-500" title={error}>
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
  const infoRows = [
    { label: messages.about.application, value: 'EchoType' },
    { label: messages.about.version, value: `v${APP_VERSION}` },
    { label: messages.about.techStack, value: 'Next.js + React + TypeScript' },
    { label: messages.about.dataStorage, value: messages.about.localIndexedDbAndCloudSync },
    { label: messages.about.desktop, value: 'Tauri v2' },
  ];

  return (
    <Section title={messages.sections.about} icon={Info}>
      <div className="space-y-5">
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">EchoType</h3>
          <p className="mt-0.5 text-xs text-slate-400">v{APP_VERSION}</p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">{messages.about.appDescription}</p>
        </div>

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-medium text-slate-700">{value}</span>
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
