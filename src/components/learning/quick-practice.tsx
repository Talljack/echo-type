'use client';

import { ArrowUpRight, AudioLines } from 'lucide-react';
import Link from 'next/link';
import { type Skill, SkillTile } from '@/components/shared/skill';
import { useLanguageStore } from '@/stores/language-store';

const ITEMS: { href: string; en: string; zh: string; hintEn: string; hintZh: string; skill?: Skill }[] = [
  {
    href: '/listen',
    en: 'Listening',
    zh: '听力练习',
    hintEn: 'Hear and follow',
    hintZh: '听并跟读文本',
    skill: 'listen',
  },
  {
    href: '/read',
    en: 'Read aloud',
    zh: '跟读练习',
    hintEn: 'Shadow the text',
    hintZh: '朗读并获得反馈',
    skill: 'read',
  },
  {
    href: '/write',
    en: 'Spelling practice',
    zh: '拼写练习',
    hintEn: 'Type what you hear',
    hintZh: '边听边拼写',
    skill: 'write',
  },
  {
    href: '/speak',
    en: 'AI conversation',
    zh: 'AI 对话',
    hintEn: 'Talk in scenarios',
    hintZh: '情景对话练习',
    skill: 'speak',
  },
  {
    href: '/pronunciation',
    en: 'Pronunciation',
    zh: '发音训练',
    hintEn: 'Train single sounds',
    hintZh: '练习单个音标',
  },
];

/** Shortcuts for practising one skill without following a whole lesson. */
export function QuickPractice() {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  return (
    <section aria-labelledby="quick-practice-heading" className="space-y-3">
      <div>
        <h2 id="quick-practice-heading" className="text-[15px] font-semibold text-ink">
          {zh ? '只练一个专项' : 'Practice one skill'}
        </h2>
        <p className="mt-0.5 text-sm text-ink-3">
          {zh
            ? '不必完成整课，选择材料后自由练习。'
            : 'Choose material and practice independently, without completing a whole lesson.'}
        </p>
      </div>
      <nav
        aria-label={zh ? '快捷练习' : 'Quick practice'}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={zh ? item.zh : item.en}
            className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            {item.skill ? (
              <SkillTile skill={item.skill} />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-speak-soft text-speak-ink"
              >
                <AudioLines className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{zh ? item.zh : item.en}</span>
              <span className="block truncate text-xs text-ink-3">{zh ? item.hintZh : item.hintEn}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
