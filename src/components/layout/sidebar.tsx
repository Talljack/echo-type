'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Headphones, Mic, PenTool, Library, Settings, LayoutDashboard,
  Wrench, BookMarked, ChevronDown,
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

function NavLink({ item, pathname, depth = 0 }: { item: NavItem; pathname: string; depth?: number }) {
  const isActive = item.href === '/library'
    ? pathname === '/library' || (pathname.startsWith('/library') && !pathname.startsWith('/library/wordbooks'))
    : pathname.startsWith(item.href) && !item.children?.some(c => pathname.startsWith(c.href));

  const hasActiveChild = item.children?.some(c => pathname.startsWith(c.href));
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            'flex-1 flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer',
            depth === 0 ? 'px-3 py-2' : 'pl-9 pr-3 py-1.5',
            isActive || hasActiveChild
              ? 'bg-indigo-100 text-indigo-900'
              : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900'
          )}
        >
          <item.icon className={cn(depth === 0 ? 'w-5 h-5' : 'w-4 h-4')} />
          {item.label}
          {hasChildren && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
              className="ml-auto p-0.5 rounded hover:bg-indigo-100 cursor-pointer"
            >
              <ChevronDown className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                expanded ? 'rotate-0' : '-rotate-90'
              )} />
            </button>
          )}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div className="mt-0.5 space-y-0.5">
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
    <aside className="w-64 h-screen bg-white/70 backdrop-blur-xl border-r border-indigo-100 flex flex-col shrink-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-[var(--font-poppins)]">E</span>
          </div>
          <span className="text-xl font-bold text-indigo-900 font-[var(--font-poppins)]">
            EchoType
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
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

      <div className="p-4 border-t border-indigo-100">
        <p className="text-xs text-indigo-400 text-center">EchoType v1.0</p>
      </div>
    </aside>
  );
}
