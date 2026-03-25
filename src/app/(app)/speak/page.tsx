'use client';

import { MessageCircle, Mic } from 'lucide-react';
import Link from 'next/link';
import { ScenarioGrid } from '@/components/speak/scenario-grid';

export default function SpeakPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">Speak</h1>
            <p className="text-sm text-indigo-400">Practice English through conversation with AI</p>
          </div>
        </div>
      </div>

      {/* Free Conversation CTA */}
      <Link href="/speak/free" className="block group">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 p-6 shadow-lg shadow-indigo-200/50 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-indigo-300/50 group-hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-1">Start Free Conversation</h2>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Chat with AI about anything — daily life, hobbies, news, or whatever you like. No topic restrictions.
              </p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>

      {/* Scenario Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-indigo-400" />
          <h2 className="text-lg font-semibold text-indigo-900">Or pick a scenario</h2>
          <p className="text-sm text-indigo-400 ml-1">for guided practice</p>
        </div>
        <ScenarioGrid getHref={(scenario) => `/speak/${scenario.id}`} />
      </div>
    </div>
  );
}
