import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeTags(input: string): string[] {
  return [...new Set(
    input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  )].slice(0, 10);
}
