'use client';

import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { useAuthStore } from '@/stores/auth-store';

export function LandingNav() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ET';

  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="EchoType home">
        <BrandMark className="size-9" />
        <span className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">EchoType</span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {isLoading ? (
          <div className="h-10 w-20" />
        ) : isAuthenticated ? (
          <Link
            href="/dashboard"
            className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
                {initials}
              </span>
            )}
            <span className="hidden sm:inline">{displayName}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:px-4"
          >
            <LogIn className="size-4" />
            Sign In
          </Link>
        )}
        <Link
          href="/dashboard"
          className="flex h-10 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 sm:px-5"
        >
          Start Learning
        </Link>
      </div>
    </nav>
  );
}
