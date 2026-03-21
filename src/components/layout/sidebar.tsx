'use client';

import {
  BookMarked,
  BookOpen,
  ChevronDown,
  Headphones,
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
import { cn } from '@/lib/utils';

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
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

function NavLink({ item, pathname, depth = 0 }: { item: NavItem; pathname: string; depth?: number }) {
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
      return (
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer select-none',
            active
              ? 'bg-indigo-600 text-white font-medium'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal',
          )}
        >
          <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
          <span className="truncate">{item.label}</span>
        </Link>
      );
    }

    return (
      <div>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer select-none',
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-white border-r border-slate-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 font-[var(--font-poppins)] leading-none block">
              EchoType
            </span>
            <span className="text-[10px] text-slate-400 leading-none block mt-0.5 tracking-wide">English Learning</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-100">
        <UserMenu />
      </div>
    </aside>
  );
}
