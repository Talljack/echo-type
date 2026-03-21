'use client';

import { LogIn, LogOut, RefreshCw, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';

function getInitials(name?: string | null): string {
  if (!name) return 'ET';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  if (!user) return 'EchoType';
  const meta = user.user_metadata;
  if (meta?.full_name && typeof meta.full_name === 'string') return meta.full_name;
  if (meta?.name && typeof meta.name === 'string') return meta.name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

function getAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata;
  if (meta?.avatar_url && typeof meta.avatar_url === 'string') return meta.avatar_url;
  if (meta?.picture && typeof meta.picture === 'string') return meta.picture;
  return null;
}

export function UserMenu() {
  const { user, isAuthenticated, isLoading, isConfigured, signOut } = useAuthStore();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
        <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">ET</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-slate-700 truncate leading-none">EchoType</p>
          <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">v1.0 · Local</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150 w-full"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
          <LogIn className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-slate-700 truncate leading-none">Sign In</p>
          <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">Sync your data</p>
        </div>
      </button>
    );
  }

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);
  const avatarUrl = getAvatarUrl(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150 w-full outline-none"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-7 h-7 rounded-full shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-slate-700 truncate leading-none">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email ?? 'Signed in'}</p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-slate-500">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <User className="mr-2 h-4 w-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Status
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push('/dashboard');
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
