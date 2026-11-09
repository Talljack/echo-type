'use client';

import { ArrowRight, FileText, Link2, MessageCircle, Mic, Play, RotateCcw, Sparkles, Video } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { ChatFab } from '@/components/chat/chat-fab';
import { LandingNav } from '@/components/layout/landing-nav';
import { SKILL_ORDER, type Skill, SkillTile } from '@/components/shared/skill';

const SKILL_FEATURES: Record<Skill, { title: string; desc: string; href: string }> = {
  listen: {
    title: 'Listen',
    desc: 'Follow an interactive transcript, slow it down, and replay the line you missed.',
    href: '/listen',
  },
  speak: {
    title: 'Speak',
    desc: 'Read aloud with live speech recognition and colour-coded pronunciation feedback.',
    href: '/speak',
  },
  read: {
    title: 'Read',
    desc: 'Read with translation on tap, save words in context, and explain ideas in your own words.',
    href: '/read',
  },
  write: {
    title: 'Write',
    desc: 'Type the material, catch every mistake as it happens, and review what you got wrong.',
    href: '/write',
  },
};

const STEPS = [
  {
    icon: Link2,
    title: 'Bring anything',
    desc: 'Paste a YouTube link or web article, or upload audio, a PDF or your own text.',
  },
  {
    icon: Sparkles,
    title: 'Get a lesson',
    desc: 'EchoType splits it into short lessons you can practise with all four skills.',
  },
  {
    icon: RotateCcw,
    title: 'Keep it',
    desc: 'Spaced review brings back the words and mistakes that matter, right before you forget.',
  },
];

function LessonPreview() {
  return (
    <div className="card-paper relative overflow-hidden shadow-xl" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-listen-soft text-listen-ink">
          <Video className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">Why we forget what we learn</p>
          <p className="text-xs text-ink-3">Lesson 2 of 6 · 4 min</p>
        </div>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">B1</span>
      </div>
      <div className="flex items-center gap-1 px-5 pt-4">
        {SKILL_ORDER.map((skill, index) => (
          <span
            key={skill}
            className={`h-1.5 flex-1 rounded-full ${index === 0 ? 'bg-listen' : index === 1 ? 'bg-speak/70' : 'bg-surface-3'}`}
          />
        ))}
      </div>
      <div className="prose-reading space-y-2 px-5 py-4 text-[16px] leading-[1.75]">
        <p className="text-ink-3">Most people think memory works like a recording.</p>
        <p>
          <span className="rounded-[4px] bg-highlight px-1 py-0.5 text-ink">
            In fact, every time you recall something,
          </span>{' '}
          <span className="text-ink-2">you rebuild it from scratch.</span>
        </p>
        <p className="text-ink-4">That is why practice beats rereading.</p>
      </div>
      <div className="flex items-center gap-3 border-t border-line bg-surface-2 px-5 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand">
          <Play className="size-4 fill-current" />
        </span>
        <div className="flex h-7 flex-1 items-center justify-between">
          {[8, 14, 22, 12, 26, 18, 10, 20, 28, 16, 9, 22, 14, 24, 11, 18, 26, 12, 8, 16, 10, 20, 13, 8].map((h, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative waveform
              key={i}
              style={{ height: h }}
              className={`w-[3px] rounded-full ${i < 9 ? 'bg-brand' : 'bg-line-strong'}`}
            />
          ))}
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-speak-soft text-speak-ink">
          <Mic className="size-4" />
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <h1 className="font-display text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[64px]">
            One video or article. Every skill.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            Turn the English you actually want to watch and read into a complete lesson. Hear it, say it, read it and
            write it, with feedback at every step.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-on-brand shadow-sm transition-colors hover:bg-brand-strong"
            >
              Get Started Free
              <ArrowRight className="size-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-xl px-5 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              How it works
            </a>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <Video className="size-4" /> YouTube &amp; audio
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-4" /> Articles, PDFs &amp; text
            </span>
            <span>No account needed</span>
          </p>
        </div>
        <LessonPreview />
      </section>

      <section id="how-it-works" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink">
            From any material to a lesson
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-sm font-medium text-ink-4">0{index + 1}</span>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-3">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink">
          Four skills. The same material.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SKILL_ORDER.map((skill) => {
            const feature = SKILL_FEATURES[skill];
            return (
              <Link
                key={skill}
                href={feature.href}
                className="card-paper group flex gap-4 p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <SkillTile skill={skill} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-3">{feature.desc}</p>
                </div>
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="card-paper group flex gap-4 p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md md:col-span-2"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
              <MessageCircle className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-ink">AI Tutor</h3>
              <p className="mt-1 leading-relaxed text-ink-3">
                Ask about grammar, vocabulary or the lesson in front of you. Bring your own AI provider.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-ink-3 sm:flex-row sm:px-8">
          <span className="flex items-center gap-2">
            <BrandMark className="size-6" />
            EchoType
          </span>
          <span>Your data stays on your device unless you choose to sync.</span>
        </div>
      </footer>

      <ChatFab />
    </div>
  );
}
