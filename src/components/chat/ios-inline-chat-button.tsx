'use client';

import { MessageCircle, Sparkles } from 'lucide-react';
import { detectIOSNativeHost, nativeHaptic } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';

interface IOSInlineChatButtonProps {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export function IOSInlineChatButton({ className, compact = false, iconOnly = false }: IOSInlineChatButtonProps) {
  const isIOSNativeHost = detectIOSNativeHost();
  const toggleOpen = useChatStore((s) => s.toggleOpen);

  if (!isIOSNativeHost) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        nativeHaptic('light');
        toggleOpen();
      }}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-white/82 bg-white/90 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-200 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] active:scale-[0.98]',
        iconOnly
          ? 'h-10 w-10 justify-center'
          : compact
            ? 'h-10 px-3.5 text-sm font-semibold'
            : 'h-11 px-4 text-sm font-semibold',
        className,
      )}
      aria-label="Open AI chat"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5b5cf0_0%,#4f46e5_100%)] text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)]">
        <MessageCircle className="h-3.5 w-3.5" />
      </span>
      {!iconOnly && <span className="leading-none tracking-[-0.01em]">AI Tutor</span>}
      {!compact && !iconOnly && (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600">
          <Sparkles className="h-3 w-3" />
          Ask
        </span>
      )}
    </button>
  );
}
