'use client';

import { ArrowRight, BookOpen, Headphones, MessageCircle, Mic, PenTool, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ChatFab } from '@/components/chat/chat-fab';
import { LandingNav } from '@/components/layout/landing-nav';
import { detectIOSNativeHost } from '@/lib/tauri';

function getNativeHostSearchParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nativeHost');
}

export default function LandingPage() {
  const isIOSNativeHost = getNativeHostSearchParam() === 'ios' || detectIOSNativeHost();
  const features = [
    {
      icon: Headphones,
      title: 'Listen',
      desc: 'Listen to English articles, phrases, sentences, and words with adjustable speed and interactive transcripts.',
      color: 'bg-blue-500',
      href: '/listen',
    },
    {
      icon: Mic,
      title: 'Speak',
      desc: 'Practice speaking with real-time speech recognition and get color-coded pronunciation feedback.',
      color: 'bg-green-500',
      href: '/speak',
    },
    {
      icon: BookOpen,
      title: 'Read',
      desc: 'Read English articles with interactive translation, word collection, and comprehension tracking.',
      color: 'bg-amber-500',
      href: '/read',
    },
    {
      icon: PenTool,
      title: 'Write',
      desc: 'Practice typing English with real-time error correction, WPM tracking, and spaced repetition.',
      color: 'bg-purple-500',
      href: '/write',
    },
    {
      icon: MessageCircle,
      title: 'AI Tutor',
      desc: 'Chat with an AI English tutor that knows your learning context and helps you improve.',
      color: 'bg-indigo-500',
      href: '/dashboard',
    },
  ];
  return (
    <div
      className={
        isIOSNativeHost
          ? 'min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_42%,#eef2ff_100%)]'
          : 'min-h-screen bg-[#EEF2FF]'
      }
    >
      <LandingNav />

      <section
        className={
          isIOSNativeHost
            ? 'mx-auto max-w-4xl px-5 pb-10 pt-8'
            : 'max-w-4xl mx-auto text-center px-8 pt-12 sm:pt-20 pb-16'
        }
      >
        {isIOSNativeHost ? (
          <div className="rounded-[32px] border border-white/70 bg-white/82 px-5 py-6 shadow-[0_24px_54px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              <Sparkles className="h-3.5 w-3.5" />
              English Practice Hub
            </div>
            <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.02] tracking-[-0.05em] text-slate-950 font-[var(--font-poppins)]">
              Learn English in one calm, focused daily flow
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Switch between listen, speak, read, write and review without leaving your practice context. EchoType keeps
              every exercise, note and AI hint in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.24)] transition-colors duration-200 hover:bg-indigo-700 cursor-pointer"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/speak"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 cursor-pointer"
              >
                Try Speaking
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-5xl md:text-6xl font-bold text-indigo-900 font-[var(--font-poppins)] leading-tight">
              Master English Through
              <br />
              <span className="text-indigo-600">Immersive Practice</span>
            </h1>
            <p className="mt-6 text-lg text-indigo-600 max-w-2xl mx-auto">
              Listen, speak, read, and write — with AI-powered feedback at every step. Import your own content and
              master English through immersive practice.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </>
        )}
      </section>

      <section className={isIOSNativeHost ? 'mx-auto max-w-6xl px-5 pb-24' : 'max-w-6xl mx-auto px-8 pb-20'}>
        <div
          className={
            isIOSNativeHost ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'grid grid-cols-1 md:grid-cols-2 gap-6'
          }
        >
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              href={feature.href}
              className={`block cursor-pointer transition-all duration-200 ${
                isIOSNativeHost
                  ? 'rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl'
                  : 'bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-indigo-100 hover:shadow-lg hover:-translate-y-0.5'
              } ${index === features.length - 1 && features.length % 2 === 1 ? 'md:col-span-2' : ''}`}
            >
              <div
                className={`${isIOSNativeHost ? 'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]' : 'w-12 h-12 rounded-xl flex items-center justify-center mb-4'} ${feature.color}`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3
                className={
                  isIOSNativeHost
                    ? 'mb-2 text-lg font-semibold tracking-[-0.02em] text-slate-950 font-[var(--font-poppins)]'
                    : 'text-xl font-semibold text-indigo-900 font-[var(--font-poppins)] mb-2'
                }
              >
                {feature.title}
              </h3>
              <p className={isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'text-indigo-600'}>{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer
        className={
          isIOSNativeHost
            ? 'border-t border-slate-200/70 py-8 text-center text-sm text-slate-400'
            : 'border-t border-indigo-100 py-8 text-center text-sm text-indigo-400'
        }
      >
        <p>EchoType — Learn English by doing. Built with Next.js, Vercel AI SDK, and Web Speech API.</p>
      </footer>

      <ChatFab />
    </div>
  );
}
