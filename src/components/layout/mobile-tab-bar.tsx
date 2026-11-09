'use client';

import { BookOpenText, CalendarCheck2, type LucideIcon, Menu, Plus, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { learningSection, PRIMARY_LEARNING_LINKS } from '@/lib/learning-navigation';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';

/**
 * Mobile bottom navigation (hidden from md up). The centre button adds new
 * material — the start of every lesson — and "More" opens the full drawer.
 */
export function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const pathname = usePathname();
  const section = learningSection(pathname);

  const tab = (section: 'today' | 'courses' | 'review', icon: LucideIcon) => {
    const link = PRIMARY_LEARNING_LINKS.find((item) => item.section === section);
    return { href: link?.href ?? '/dashboard', section, label: link ? (zh ? link.zh : link.en) : section, icon };
  };
  const tabs = [tab('today', CalendarCheck2), tab('courses', BookOpenText)];
  const tabsRight = [tab('review', RotateCcw)];

  const renderTab = (tab: { href: string; section: string; label: string; icon: LucideIcon }) => {
    const active = section === tab.section;
    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
          active ? 'text-brand-ink' : 'text-ink-3',
        )}
      >
        <tab.icon className="size-5" aria-hidden="true" />
        {tab.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label={zh ? '底部导航' : 'Bottom navigation'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 pb-safe backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {tabs.map(renderTab)}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/library/import"
            aria-label={zh ? '添加素材' : 'Add material'}
            className="flex size-12 -translate-y-3 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lg ring-4 ring-canvas transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        </div>
        {tabsRight.map(renderTab)}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-3"
        >
          <Menu className="size-5" aria-hidden="true" />
          {zh ? '更多' : 'More'}
        </button>
      </div>
    </nav>
  );
}
