'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, Mic, PenTool, Library, Settings, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/listen', label: 'Listen', icon: Headphones },
  { href: '/speak', label: 'Speak / Read', icon: Mic },
  { href: '/write', label: 'Write', icon: PenTool },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/settings', label: 'Settings', icon: Settings },
];

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

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer',
                isActive
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-indigo-100">
        <p className="text-xs text-indigo-400 text-center">EchoType v1.0</p>
      </div>
    </aside>
  );
}
