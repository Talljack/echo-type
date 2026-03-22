'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownCircle,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Headphones,
  Heart,
  LayoutDashboard,
  Library,
  MessageCircle,
  PenTool,
  Settings,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UserMenu } from '@/components/auth/user-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UpdateDialog } from '@/components/updater/update-dialog';
import { IS_TAURI } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useUpdaterStore } from '@/stores/updater-store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Learning',
    items: [
      { href: '/listen', label: 'Listen', icon: Headphones },
      { href: '/speak', label: 'Speak', icon: MessageCircle },
      { href: '/read', label: 'Read', icon: BookOpen },
      { href: '/write', label: 'Write', icon: PenTool },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/library', label: 'Library', icon: Library },
      { href: '/library/wordbooks', label: 'Word Books', icon: BookMarked },
      { href: '/favorites', label: 'Favorites', icon: Heart },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

function NavLink({
  item,
  pathname,
  depth = 0,
  collapsed = false,
}: {
  item: NavItem;
  pathname: string;
  depth?: number;
  collapsed?: boolean;
}) {
  const isActive =
    item.href === '/library'
      ? pathname === '/library' || (pathname.startsWith('/library') && !pathname.startsWith('/library/wordbooks'))
      : pathname.startsWith(item.href) && !item.children?.some((c) => pathname.startsWith(c.href));

  const hasActiveChild = item.children?.some((c) => pathname.startsWith(c.href));
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!(item.children && item.children.length > 0);
  const active = isActive || hasActiveChild;

  if (depth === 0) {
    if (!hasChildren) {
      const link = (
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer select-none',
            collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
            active
              ? 'bg-indigo-600 text-white font-medium'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal',
          )}
        >
          <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      );

      if (collapsed) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }

      return link;
    }

    if (collapsed) {
      // Collapsed: show only parent icon, no children
      const link = (
        <Link
          href={item.href}
          className={cn(
            'flex items-center justify-center px-2 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer select-none',
            active
              ? 'bg-indigo-600 text-white font-medium'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal',
          )}
        >
          <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
        </Link>
      );

      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer select-none w-full',
            active
              ? 'bg-indigo-600 text-white font-medium'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal',
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
          <span className="truncate flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
              active ? 'text-indigo-200' : 'text-slate-300',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
          />
        </button>

        {hasChildren && expanded && (
          <div className="mt-0.5 ml-3.5 pl-3 border-l border-slate-200 space-y-0.5">
            {item.children!.map((child) => (
              <NavLink key={child.href} item={child} pathname={pathname} depth={1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // depth >= 1: child item — minimal, text-only style
  const childActive = pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors duration-150 cursor-pointer',
        childActive
          ? 'text-indigo-600 font-medium bg-indigo-50'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-normal',
      )}
    >
      <item.icon className={cn('w-3.5 h-3.5 shrink-0', childActive ? 'text-indigo-500' : 'text-slate-350')} />
      {item.label}
    </Link>
  );
}

function UpdateIndicator({ collapsed }: { collapsed: boolean }) {
  const status = useUpdaterStore((s) => s.status);
  const openDialog = useUpdaterStore((s) => s.openDialog);

  const visible = status === 'available' || status === 'downloaded';

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3"
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={openDialog}
                    className="flex w-full items-center justify-center rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {status === 'downloaded' ? 'Restart to Update' : 'Update Available'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={openDialog}
                className="flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>{status === 'downloaded' ? 'Restart to Update' : 'Update Available'}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <UpdateDialog />
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('border-b border-slate-100', collapsed ? 'px-2 py-4' : 'px-4 py-4')}>
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-[15px] font-bold text-slate-900 font-[var(--font-poppins)] leading-none block">
                EchoType
              </span>
              <span className="text-[10px] text-slate-400 leading-none block mt-0.5 tracking-wide">
                English Learning
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-3 space-y-4 overflow-y-auto', collapsed ? 'px-1.5' : 'px-2')}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Update indicator - only in Tauri desktop */}
      {IS_TAURI && <UpdateIndicator collapsed={collapsed} />}

      {/* User menu + Collapse toggle */}
      <div className={cn('border-t border-slate-100', collapsed ? 'px-2 py-2 space-y-1' : 'px-2 py-2 space-y-1')}>
        <UserMenu collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center w-full rounded-lg py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-2',
          )}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
