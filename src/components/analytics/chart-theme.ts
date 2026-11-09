import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { InterfaceLanguage } from '@/stores/language-store';

/*
 * Recharts styling from the Studio Paper tokens. Recharts writes these values straight into SVG/HTML attributes and
 * inline styles, where CSS variables resolve, so every chart follows the light/dark theme with no re-render.
 */

/** The same colour always means the same skill, in charts too. Keep this order: it is the legend and stack order. */
export const SKILL_COLORS = {
  listen: 'var(--listen)',
  speak: 'var(--speak)',
  read: 'var(--read)',
  write: 'var(--write)',
} as const;

export const CHART_COLORS = {
  /** Single-series charts (accuracy, words, reviews) are not about one skill, so they use the progress colour. */
  series: 'var(--brand)',
  seriesFill: 'var(--brand-soft)',
  grid: 'var(--line)',
  /** Axis lines stay recessive; their labels use AXIS_TICK. */
  axis: 'var(--line)',
  /** Marks for unknown categories, and the gap/ring drawn between touching marks. */
  neutral: 'var(--ink-4)',
  surface: 'var(--surface)',
} as const;

export const AXIS_TICK = { fontSize: 11, fill: 'var(--ink-3)' } as const;

export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  borderRadius: 8,
  border: '1px solid var(--line)',
  backgroundColor: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 12,
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = { color: 'var(--ink)' };

/** Hover highlight behind a bar column (Recharts' default is a light grey that glares in the dark theme). */
export const BAR_CURSOR = { fill: 'var(--surface-2)' } as const;
/** Hover rule on line and area charts. */
export const LINE_CURSOR = { stroke: 'var(--line-strong)' } as const;
/** Hovered point: ringed with the surface colour instead of Recharts' default white. */
export const ACTIVE_DOT = { r: 4, stroke: 'var(--surface)', strokeWidth: 2 } as const;

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Analytics dates are local calendar-day keys (`YYYY-MM-DD`). `new Date(key)` would read them as UTC midnight and
 * show the previous day anywhere west of UTC, so they are built from their parts instead.
 */
export function parseDateKey(value: string): Date | null {
  const match = DATE_KEY.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createDateFormatter(language: InterfaceLanguage, options: Intl.DateTimeFormatOptions) {
  const format = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', options);
  return (value: unknown): string => {
    const date = typeof value === 'string' ? parseDateKey(value) : null;
    return date ? format.format(date) : String(value ?? '');
  };
}

/** Axis ticks ("Nov 9" · "11月9日") and tooltip titles ("Mon, Nov 9" · "11月9日周一") in the interface language. */
export function useChartDateFormatters(language: InterfaceLanguage) {
  return useMemo(
    () => ({
      tick: createDateFormatter(language, { month: 'short', day: 'numeric' }),
      label: createDateFormatter(language, { weekday: 'short', month: 'short', day: 'numeric' }),
    }),
    [language],
  );
}
