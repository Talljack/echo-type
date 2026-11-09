import { describe, expect, it } from 'vitest';
import { createDateFormatter, parseDateKey } from './chart-theme';

describe('chart date formatting', () => {
  it('reads date keys as local calendar days', () => {
    const date = parseDateKey('2026-11-09');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 10, 9]);
    expect(date?.getHours()).toBe(0);
  });

  it('rejects values that are not date keys', () => {
    expect(parseDateKey('11/09/2026')).toBeNull();
    expect(parseDateKey('')).toBeNull();
  });

  it('formats ticks in the interface language', () => {
    expect(createDateFormatter('en', { month: 'short', day: 'numeric' })('2026-11-09')).toBe('Nov 9');
    expect(createDateFormatter('zh', { month: 'short', day: 'numeric' })('2026-11-09')).toBe('11月9日');
  });

  it('keeps the calendar day of the key (no UTC shift)', () => {
    const weekday = createDateFormatter('en', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(weekday('2026-11-09')).toBe('Mon, Nov 9');
  });

  it('passes through values it cannot parse', () => {
    expect(createDateFormatter('en', { month: 'short' })('soon')).toBe('soon');
  });
});
