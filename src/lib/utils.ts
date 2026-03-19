import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Detect Apple platforms at runtime to avoid server-side evaluation locking the wrong result. */
export function isMac() {
  if (typeof navigator === 'undefined') return false;

  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent;

  return /Mac|iPod|iPhone|iPad/.test(platform) || /Macintosh/.test(navigator.userAgent);
}

export function normalizeTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 10);
}
