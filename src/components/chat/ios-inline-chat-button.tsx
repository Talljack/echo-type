'use client';

interface IOSInlineChatButtonProps {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export function IOSInlineChatButton({ className, compact = false, iconOnly = false }: IOSInlineChatButtonProps) {
  // The AI tutor is a global action on iOS and is rendered by ChatFab.
  // Keep this component as a no-op for older page compositions so they do not
  // reintroduce a second, top-aligned entry point.
  void className;
  void compact;
  void iconOnly;
  return null;
}
