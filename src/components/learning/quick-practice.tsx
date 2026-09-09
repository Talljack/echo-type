'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/stores/language-store';

export function QuickPractice() {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  return (
    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-indigo-700">
        {zh ? '只练一个专项' : 'Practice one skill'}
      </summary>
      <p className="mb-3 text-sm text-slate-500">
        {zh
          ? '不必完成整课，选择材料后自由练习。'
          : 'Choose material and practice independently, without completing a whole lesson.'}
      </p>
      <nav aria-label={zh ? '快捷练习' : 'Quick practice'} className="flex flex-wrap gap-2">
        {[
          ['/listen', 'Listening', '听力练习'],
          ['/read', 'Read aloud', '跟读练习'],
          ['/write', 'Spelling practice', '拼写练习'],
          ['/speak', 'AI conversation', 'AI 对话'],
          ['/pronunciation', 'Pronunciation', '发音训练'],
        ].map(([href, en, cn]) => (
          <Link
            key={href}
            href={href}
            className="inline-flex min-h-11 items-center rounded-lg bg-indigo-50 px-3 text-sm text-indigo-700 hover:bg-indigo-100"
          >
            {zh ? cn : en}
          </Link>
        ))}
      </nav>
    </details>
  );
}
