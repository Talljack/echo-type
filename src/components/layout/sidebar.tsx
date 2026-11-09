'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownCircle,
  AudioLines,
  BookOpenText,
  CalendarCheck2,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Library,
  Loader2,
  type LucideIcon,
  MessagesSquare,
  Moon,
  NotebookPen,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserMenu } from '@/components/auth/user-menu';
import { BrandMark, BrandWordmark } from '@/components/brand/brand-mark';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UpdateDialog } from '@/components/updater/update-dialog';
import { useI18n } from '@/lib/i18n/use-i18n';
import {
  LEARNING_NAV_GROUPS,
  type LearningSection,
  learningSection,
  PRIMARY_LEARNING_LINKS,
} from '@/lib/learning-navigation';
import { IS_TAURI } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useAppearanceStore } from '@/stores/appearance-store';
import { useLanguageStore } from '@/stores/language-store';
import { useUpdaterStore } from '@/stores/updater-store';

export interface ShellNavItem {
  section: LearningSection;
  href: string;
  en: string;
  zh: string;
  icon: LucideIcon;
}

const SECTION_ICONS: Record<LearningSection, LucideIcon> = {
  today: CalendarCheck2,
  courses: BookOpenText,
  review: RotateCcw,
  notes: NotebookPen,
  materials: Library,
  resources: Compass,
  conversation: MessagesSquare,
  pronunciation: AudioLines,
  settings: Settings,
};

export const SHELL_NAV_GROUPS = LEARNING_NAV_GROUPS.map((group) => ({
  ...group,
  // Study group reads in learning order: Today → Courses → Review → Notes.
  items: PRIMARY_LEARNING_LINKS.filter((link) => link.group === group.id).map(
    (link): ShellNavItem => ({
      section: link.section,
      href: link.href,
      en: link.en,
      zh: link.zh,
      icon: SECTION_ICONS[link.section],
    }),
  ),
}));

const COLLAPSE_KEY = 'echotype_sidebar_collapsed';

function NavItem({
  item,
  active,
  collapsed,
  zh,
}: {
  item: ShellNavItem;
  active: boolean;
  collapsed: boolean;
  zh: boolean;
}) {
  const label = zh ? item.zh : item.en;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl text-[14px] font-medium transition-[background-color,color,box-shadow] duration-150 select-none',
        collapsed ? 'size-11 justify-center' : 'h-10 px-3',
        active
          ? 'bg-surface text-ink shadow-xs ring-1 ring-line'
          : 'text-ink-2 hover:bg-surface/70 hover:text-ink dark:hover:bg-surface-2/70',
      )}
    >
      <item.icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active ? 'text-brand-ink' : 'text-ink-3 group-hover:text-ink-2',
        )}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function UpdateIndicator({ collapsed }: { collapsed: boolean }) {
  const status = useUpdaterStore((s) => s.status);
  const openDialog = useUpdaterStore((s) => s.openDialog);
  const downloadUpdate = useUpdaterStore((s) => s.downloadUpdate);
  const progress = useUpdaterStore((s) => s.downloadProgress);
  const { messages } = useI18n('sidebar');

  const visible = status === 'available' || status === 'downloading' || status === 'downloaded';
  const label =
    status === 'downloaded'
      ? messages.updater.restartToUpdate
      : status === 'downloading'
        ? `${messages.updater.downloading} ${progress}%`
        : messages.updater.downloadUpdate;
  const Icon = status === 'downloading' ? Loader2 : status === 'downloaded' ? RotateCcw : ArrowDownCircle;
  const handleClick = () => {
    openDialog();
    if (status === 'available') void downloadUpdate();
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-2"
          >
            <button
              type="button"
              onClick={handleClick}
              aria-label={label}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl bg-brand-soft text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-tint',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
              )}
            >
              <Icon className={cn('size-4 shrink-0', status === 'downloading' && 'animate-spin')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <UpdateDialog />
    </>
  );
}

function ThemeToggle({ collapsed, zh }: { collapsed: boolean; zh: boolean }) {
  const theme = useAppearanceStore((s) => s.theme);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const label = isDark ? (zh ? '切换到浅色' : 'Switch to light') : zh ? '切换到深色' : 'Switch to dark';
  const button = (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      data-theme-setting={theme}
      className={cn(
        'flex items-center gap-3 rounded-xl text-[13px] font-medium text-ink-3 transition-colors hover:bg-surface/70 hover:text-ink dark:hover:bg-surface-2/70',
        collapsed ? 'size-11 justify-center' : 'h-9 w-full px-3',
      )}
    >
      {isDark ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
      {!collapsed && <span>{isDark ? (zh ? '浅色模式' : 'Light mode') : zh ? '深色模式' : 'Dark mode'}</span>}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenSearch?: () => void;
}

export function Sidebar({ open = false, onOpenChange, onOpenSearch }: SidebarProps = {}) {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const pathname = usePathname();
  const current = learningSection(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const { messages } = useI18n('sidebar');

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // The mobile drawer always shows labels.
  const rail = collapsed && !open;
  const addLabel = zh ? '添加素材' : 'Add material';
  const searchLabel = zh ? '搜索' : 'Search';

  return (
    <aside
      aria-label={zh ? '主导航' : 'Main navigation'}
      className={cn(
        'flex h-dvh shrink-0 flex-col bg-canvas',
        'fixed inset-y-0 left-0 z-50 border-r border-line shadow-xl transition-transform duration-200 ease-out',
        'md:relative md:z-auto md:translate-x-0 md:shadow-none',
        rail ? 'w-[76px]' : 'w-[264px] md:w-[248px]',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      <button
        type="button"
        onClick={() => onOpenChange?.(false)}
        className="absolute top-4 right-3 z-10 flex size-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 md:hidden"
        aria-label={zh ? '关闭菜单' : 'Close menu'}
      >
        <X className="size-5" />
      </button>

      {/* Brand */}
      <div className={cn('flex items-center pt-5 pb-4', rail ? 'justify-center px-2' : 'px-5')}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="EchoType">
          <BrandMark className="size-9" />
          {!rail && <BrandWordmark subtitle={messages.logo.subtitle} />}
        </Link>
      </div>

      {/* Primary actions */}
      <div className={cn('space-y-1.5 pb-3', rail ? 'flex flex-col items-center px-2' : 'px-3')}>
        {rail ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/library/import"
                  aria-label={addLabel}
                  className="flex size-11 items-center justify-center rounded-xl bg-brand text-on-brand shadow-xs transition-colors hover:bg-brand-strong"
                >
                  <Plus className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {addLabel}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={searchLabel}
                  onClick={onOpenSearch}
                  className="flex size-11 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-surface/70 hover:text-ink"
                >
                  <Search className="size-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {searchLabel} · ⌘K
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Link
              href="/library/import"
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-on-brand shadow-xs transition-colors hover:bg-brand-strong"
            >
              <Plus className="size-4" />
              {addLabel}
            </Link>
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-3 text-sm text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
            >
              <Search className="size-4" />
              <span className="flex-1 truncate text-left">{zh ? '搜索…' : 'Search…'}</span>
              <kbd className="rounded-md border border-line bg-surface px-1.5 font-sans text-[11px] text-ink-4">⌘K</kbd>
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('scrollbar-thin flex-1 space-y-5 overflow-y-auto py-2', rail ? 'px-2' : 'px-3')}>
        {SHELL_NAV_GROUPS.map((group) => (
          <div key={group.id} className={cn(rail && 'flex flex-col items-center')}>
            {rail ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden="true" />
            ) : (
              <p className="eyebrow px-3 pb-1.5 text-ink-4">{zh ? group.zh : group.en}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} active={current === item.section} collapsed={rail} zh={zh} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {IS_TAURI && <UpdateIndicator collapsed={rail} />}

      {/* Footer */}
      <div className={cn('space-y-0.5 border-t border-line py-3', rail ? 'flex flex-col items-center px-2' : 'px-3')}>
        <NavItem
          item={{ section: 'settings', href: '/settings', en: 'Settings', zh: '设置', icon: SECTION_ICONS.settings }}
          active={current === 'settings'}
          collapsed={rail}
          zh={zh}
        />
        <ThemeToggle collapsed={rail} zh={zh} />
        <div className={cn('pt-1', rail ? 'w-full' : '')}>
          <UserMenu collapsed={rail} />
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? messages.controls.expand : messages.controls.collapse}
          className={cn(
            'hidden items-center gap-3 rounded-xl text-[13px] text-ink-4 transition-colors hover:bg-surface/70 hover:text-ink-2 md:flex',
            rail ? 'size-11 justify-center' : 'h-9 w-full px-3',
          )}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!rail && <span>{messages.controls.collapse}</span>}
        </button>
      </div>
    </aside>
  );
}
