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
  if (section !== 'notes' && section !== 'review' && section !== 'materials') return null;
  const config = sections[section];
  const Heading = pathname === '/review' ? 'h1' : 'p';
  // The most specific matching link wins: /review must not steal /review/today.
  const selected = [...config.links]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => withinRoute(pathname, href))?.[0];
  return (
    <section className="mx-auto mb-6 max-w-6xl border-b border-slate-200 pb-4" aria-label={zh ? config.zh : config.en}>
      <Heading className="text-xl font-semibold text-slate-900">{zh ? config.zh : config.en}</Heading>
      <p className="mt-1 text-sm text-slate-500">{config.description[zh ? 1 : 0]}</p>
      <nav aria-label={zh ? '分区导航' : 'Section navigation'} className="mt-3 flex flex-wrap gap-2">
        {config.links.map(([href, en, cn]) => (
          <Link
            key={href}
            href={href}
            aria-current={selected === href ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 ${selected === href ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-indigo-50'}`}
          >
            {zh ? cn : en}
          </Link>
        ))}
      </nav>
    </section>
  );
}
