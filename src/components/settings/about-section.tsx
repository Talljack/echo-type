'use client';

import { AlertCircle, ExternalLink, Info, Loader2, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { Section } from '@/components/settings/section';
import {
  IOS_EYEBROW_CLASS,
  IOS_PILL_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOS_TINTED_SUBCARD_CLASS,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { IS_IOS_NATIVE_HOST, IS_TAURI } from '@/lib/tauri';
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
  const platformLabel = IS_TAURI ? 'Tauri v2' : IS_IOS_NATIVE_HOST ? 'Native iOS Host' : 'Web';
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
        <div
          className={IS_IOS_NATIVE_HOST ? `${IOS_TINTED_SUBCARD_CLASS} px-5 py-5` : 'rounded-2xl bg-slate-50 px-5 py-5'}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/70">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              {IS_IOS_NATIVE_HOST ? <p className={IOS_EYEBROW_CLASS}>App profile</p> : null}
              <div className="mt-1 flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">EchoType</h3>
                <span className={IOS_PILL_CLASS}>v{APP_VERSION}</span>
              </div>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{messages.about.appDescription}</p>
              {IS_IOS_NATIVE_HOST ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={IOS_PILL_CLASS}>Native shell</span>
                  <span className={IOS_PILL_CLASS}>Local-first sync</span>
                  <span className={IOS_PILL_CLASS}>AI practice stack</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={
            IS_IOS_NATIVE_HOST
              ? `${IOS_SUBCARD_CLASS} divide-y divide-slate-100/90`
              : 'divide-y divide-slate-100 rounded-lg border border-slate-100'
          }
        >
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div>
                {IS_IOS_NATIVE_HOST ? (
                  <p className={IOS_EYEBROW_CLASS}>{label}</p>
                ) : (
                  <span className="text-sm text-slate-500">{label}</span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700">{value}</span>
            </div>
          ))}
        </div>

        {IS_IOS_NATIVE_HOST ? (
          <div className={IOS_SUBCARD_CLASS}>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={IOS_EYEBROW_CLASS}>Updates</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{messages.about.checkForUpdates}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep the native shell and learning flows aligned with the latest release.
                </p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <UpdateButton />
            </div>
          </div>
        ) : (
          <UpdateButton />
        )}

        <div className="flex items-center gap-3">
          <a href="https://github.com/Talljack/echo-type" target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button
              variant="outline"
              className={
                IS_IOS_NATIVE_HOST
                  ? `w-full cursor-pointer gap-2 text-sm ${IOS_TERTIARY_BUTTON_CLASS}`
                  : 'w-full cursor-pointer gap-2 text-sm'
              }
            >
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
            <Button
              variant="outline"
              className={
                IS_IOS_NATIVE_HOST
                  ? `w-full cursor-pointer gap-2 text-sm ${IOS_TERTIARY_BUTTON_CLASS}`
                  : 'w-full cursor-pointer gap-2 text-sm'
              }
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {messages.about.reportBug}
            </Button>
          </a>
        </div>
      </div>
    </Section>
  );
}
