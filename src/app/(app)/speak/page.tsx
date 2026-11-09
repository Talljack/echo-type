'use client';

import { MessageCircle, Mic } from 'lucide-react';
import Link from 'next/link';
import { ScenarioGrid } from '@/components/speak/scenario-grid';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function SpeakPage() {
  const { messages } = useI18n('speak');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{messages.page.title}</h1>
            <p className="text-sm text-brand-muted">{messages.page.subtitle}</p>
          </div>
        </div>
      </div>

      <Link href="/speak/free" className="block group" data-testid="speak-free-conversation-entry">
        <div className="relative overflow-hidden rounded-2xl bg-brand p-6 shadow-sm transition-colors duration-200 group-hover:bg-brand-strong">
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-1">{messages.freeConversation.title}</h2>
              <p className="text-on-brand text-sm leading-relaxed">{messages.freeConversation.description}</p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-brand-muted" />
          <h2 className="text-lg font-semibold text-ink">{messages.scenarios.sectionTitle}</h2>
          <p className="text-sm text-brand-muted ml-1">{messages.scenarios.sectionSubtitle}</p>
        </div>
        <ScenarioGrid getHref={(scenario) => `/speak/${scenario.id}`} />
      </div>
    </div>
  );
}
