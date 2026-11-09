'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { learningSection, withinRoute } from '@/lib/learning-navigation';
import { useLanguageStore } from '@/stores/language-store';

const sections = {
  notes: {
    en: 'My notes',
    zh: '我的笔记',
    description: [
      'Keep words, useful expressions and their context together.',
      '集中整理单词、实用表达和出处，保留原有笔记。',
    ],
    links: [
      ['/favorites', 'Saved notes', '收藏笔记'],
      ['/journal', 'Useful expressions', '实用表达'],
    ],
  },
  review: {
    en: 'Review center',
    zh: '复习中心',
    description: [
      'Revisit lessons, recall saved notes and work on weak spots.',
      '复习课程、回忆收藏内容，针对薄弱项继续练习。',
    ],
    links: [
      ['/review', 'Overview', '复习概览'],
      ['/review/today', 'Lesson review', '课程复习'],
      ['/library/vocabulary', 'Vocabulary review', '单词复习'],
      ['/favorites/review', 'Notes review', '笔记复习'],
      ['/weak-spots', 'Weak spots', '薄弱项'],
    ],
  },
  materials: {
    en: 'Learning materials',
    zh: '学习资料',
    description: [
      'Manage originals here. Follow lessons and progress in My courses.',
      '在这里管理原始材料，在“我的课程”中按课学习。',
    ],
    links: [
      ['/library', 'My materials', '我的资料'],
      ['/library/wordbooks', 'Word books', '词书'],
      ['/library/import', 'Import material', '导入材料'],
    ],
  },
} as const;

export function LearningSectionNav() {
  const pathname = usePathname();
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const section = learningSection(pathname);
  if (section !== 'notes' && section !== 'review') return null;
  const config = sections[section];
  const Heading = pathname === '/review' ? 'h1' : 'p';
  // The most specific matching link wins: /review must not steal /review/today.
  const selected = pathname.startsWith('/library/vocabulary')
    ? '/library/wordbooks'
    : [...config.links].sort((a, b) => b[0].length - a[0].length).find(([href]) => withinRoute(pathname, href))?.[0];
  return (
    <section className="mx-auto mb-8 max-w-6xl" aria-label={zh ? config.zh : config.en}>
      <p className="eyebrow">{zh ? '学习' : 'Study'}</p>
      <Heading className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-ink sm:text-[34px]">
        {zh ? config.zh : config.en}
      </Heading>
      <p className="mt-1.5 text-[15px] text-ink-3">{config.description[zh ? 1 : 0]}</p>
      <nav
        aria-label={zh ? '分区导航' : 'Section navigation'}
        className="scrollbar-none mt-5 -mb-px flex gap-1 overflow-x-auto border-b border-line"
      >
        {config.links.map(([href, en, cn]) => {
          const active = selected === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                active
                  ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {zh ? cn : en}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
