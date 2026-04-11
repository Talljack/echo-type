'use client';

import { LogIn, LogOut, RefreshCw, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAuthStore } from '@/stores/auth-store';

function getInitials(name?: string | null): string {
  if (!name) return 'ET';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(
  user: { user_metadata?: Record<string, unknown>; email?: string } | null,
  fallbackUser: string,
): string {
  if (!user) return 'EchoType';
  const meta = user.user_metadata;
  if (meta?.full_name && typeof meta.full_name === 'string') return meta.full_name;
  if (meta?.name && typeof meta.name === 'string') return meta.name;
  if (user.email) return user.email.split('@')[0];
  return fallbackUser;
}

function getAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata;
  if (meta?.avatar_url && typeof meta.avatar_url === 'string') return meta.avatar_url;
  if (meta?.picture && typeof meta.picture === 'string') return meta.picture;
  return null;
}

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, isAuthenticated, isLoading, isConfigured, signOut } = useAuthStore();
  const router = useRouter();
  const { messages: settingsMessages } = useI18n('settings');
  const accountMessages = settingsMessages.account;
  const pageMessages = settingsMessages.page;

  // Loading state
  if (isLoading) {
    if (collapsed) {
      return (
        <div className="flex items-center justify-center py-1">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Not configured (local-only mode) — hide entirely
  if (!isConfigured) {
    return null;
  }

  // Not authenticated — show sign-in prompt
  if (!isAuthenticated || !user) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex items-center justify-center w-full py-1 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {accountMessages.signInToSync}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150 w-full"
      >
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
          <LogIn className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-slate-500 group-hover:text-slate-700 truncate leading-none transition-colors">
            {accountMessages.signIn}
          </p>
          <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
            {accountMessages.cloudSyncDescription}
          </p>
        </div>
      </button>
    );
  }

  // Authenticated
  const displayName = getDisplayName(user, accountMessages.fallbackUser);
  const initials = getInitials(displayName);
  const avatarUrl = getAvatarUrl(user);

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={displayName}
      className="w-8 h-8 rounded-full shrink-0 object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
      <span className="text-white text-[10px] font-bold">{initials}</span>
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <button type="button" className="flex items-center justify-center w-full py-1 cursor-pointer outline-none">
            {avatar}
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150 w-full outline-none"
          >
            {avatar}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-slate-700 truncate leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                {user.email ?? accountMessages.signedIn}
              </p>
            </div>
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align={collapsed ? 'center' : 'start'} className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-slate-500">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          {pageMessages.title}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          {accountMessages.cloudSyncTitle}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push('/dashboard');
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {accountMessages.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
