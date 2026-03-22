'use client';

import { AlertCircle, ExternalLink, Info, Zap } from 'lucide-react';
import { Section } from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import { APP_VERSION } from '@/lib/version';

const INFO_ROWS = [
  { label: 'Application', value: 'EchoType' },
  { label: 'Version', value: `v${APP_VERSION}` },
  { label: 'Tech Stack', value: 'Next.js + React + TypeScript' },
  { label: 'Data Storage', value: 'Local (IndexedDB) + Cloud Sync' },
  { label: 'Desktop', value: 'Tauri v2' },
];

export function AboutSection() {
  return (
    <Section title="About" icon={Info}>
      <div className="space-y-5">
        {/* App identity */}
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-3">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">EchoType</h3>
          <p className="text-xs text-slate-400 mt-0.5">v{APP_VERSION}</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            An English learning app for mastering listening, speaking, reading &amp; writing skills through practice and
            typing.
          </p>
        </div>

        {/* Info rows */}
        <div className="rounded-lg border border-slate-100 divide-y divide-slate-100">
          {INFO_ROWS.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-medium text-slate-700">{value}</span>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="flex items-center gap-3">
          <a href="https://github.com/Talljack/echo-type" target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 text-sm cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </Button>
          </a>
          <a
            href="https://github.com/Talljack/echo-type/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full gap-2 text-sm cursor-pointer">
              <AlertCircle className="w-3.5 h-3.5" />
              Report a Bug
            </Button>
          </a>
        </div>
      </div>
    </Section>
  );
}
