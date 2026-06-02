import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: vi.fn(),
}));

describe('AccuracyTrendChart', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses the shared iOS card styling in the native host', async () => {
    const { detectIOSNativeHost } = await import('@/lib/tauri');
    vi.mocked(detectIOSNativeHost).mockReturnValue(true);

    const { AccuracyTrendChart } = await import('./accuracy-trend-chart');

    const markup = renderToStaticMarkup(
      <AccuracyTrendChart
        data={[
          { date: '2026-05-28', accuracy: 84 },
          { date: '2026-05-29', accuracy: 91 },
        ]}
      />,
    );

    expect(markup).toContain('rounded-[26px]');
    expect(markup).toContain('bg-white/84');
  });
});
