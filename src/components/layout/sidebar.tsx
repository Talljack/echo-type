'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Headphones, Mic, PenTool, Library, Settings, LayoutDashboard,
  Wrench, BookMarked, ChevronRight, Zap,
} from 'lucide-react';
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
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/listen', label: 'Listen', icon: Headphones },
      { href: '/speak', label: 'Speak / Read', icon: Mic },
      { href: '/write', label: 'Write', icon: PenTool },
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        href: '/library', label: 'Library', icon: Library,
        children: [
          { href: '/library/wordbooks', label: 'Word Books', icon: BookMarked },
        ],
      },
      { href: '/tools', label: 'Tools', icon: Wrench },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Icon background colors per nav item for a more vivid look
const iconColors: Record<string, string> = {
  '/dashboard': 'bg-violet-100 text-violet-600',
  '/listen':    'bg-sky-100 text-sky-600',
  '/speak':     'bg-emerald-100 text-emerald-600',
  '/write':     'bg-amber-100 text-amber-600',
  '/library':   'bg-indigo-100 text-indigo-600',
  '/library/wordbooks': 'bg-indigo-100 text-indigo-500',
  '/tools':     'bg-rose-100 text-rose-600',
  '/settings':  'bg-slate-100 text-slate-600',
};

const iconColorsActive: Record<string, string> = {
  '/dashboard': 'bg-violet-500 text-white',
  '/listen':    'bg-sky-500 text-white',
  '/speak':     'bg-emerald-500 text-white',
  '/write':     'bg-amber-500 text-white',
  '/library':   'bg-indigo-500 text-white',
  '/library/wordbooks': 'bg-indigo-400 text-white',
  '/tools':     'bg-rose-500 text-white',
  '/settings':  'bg-slate-500 text-white',
};

function NavLink({ item, pathname, depth = 0 }: { item: NavItem; pathname: string; depth?: number }) {
  const isActive = item.href === '/library'
    ? pathname === '/library' || (pathname.startsWith('/library') && !pathname.startsWith('/library/wordbooks'))
    : pathname.startsWith(item.href) && !item.children?.some(c => pathname.startsWith(c.href));

  const hasActiveChild = item.children?.some(c => pathname.startsWith(c.href));
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  const active = isActive || hasActiveChild;
  const iconBg = active
    ? (iconColorsActive[item.href] ?? 'bg-indigo-500 text-white')
    : (iconColors[item.href] ?? 'bg-indigo-50 text-indigo-400');

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            'flex-1 flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group',
            depth === 0 ? 'px-2 py-2' : 'pl-10 pr-2 py-1.5',
            active
              ? 'bg-indigo-50 text-indigo-900'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          {depth === 0 ? (
            <span className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
              iconBg
            )}>
              <item.icon className="w-4 h-4" />
            </span>
          ) : (
            <item.icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-indigo-500' : 'text-slate-400')} />
          )}
          <span className={cn('flex-1 truncate', active && depth === 0 && 'font-semibold')}>
            {item.label}
          </span>
          {hasChildren && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
              className="p-1 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors duration-150"
            >
              <ChevronRight className={cn(
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                expanded ? 'rotate-90' : 'rotate-0'
              )} />
            </button>
          )}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-slate-100 pl-2">
          {item.children!.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow duration-200">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 font-[var(--font-poppins)] leading-none block">
              EchoType
            </span>
            <span className="text-[10px] text-indigo-400 font-medium tracking-wide leading-none block mt-0.5">
              English Learning
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors duration-150 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">ET</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">EchoType</p>
            <p className="text-[10px] text-slate-400 truncate">v1.0 · Local</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
