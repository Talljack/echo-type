import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: vi.fn(),
}));

describe('Dashboard mini components', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses iOS-native text tones inside mini analytics widgets', async () => {
    const { detectIOSNativeHost } = await import('@/lib/tauri');
    vi.mocked(detectIOSNativeHost).mockReturnValue(true);

    const { MiniHeatmap } = await import('./mini-heatmap');
    const { MiniReviewForecast } = await import('./mini-review-forecast');
    const { MiniModuleBreakdown } = await import('./mini-module-breakdown');

    const heatmapEmpty = renderToStaticMarkup(<MiniHeatmap data={[]} />);
    const forecastMarkup = renderToStaticMarkup(
      <MiniReviewForecast
        data={[
          { date: '2026-06-01', count: 3 },
          { date: '2026-06-02', count: 1 },
        ]}
      />,
    );
    const breakdownMarkup = renderToStaticMarkup(<MiniModuleBreakdown data={{ listen: 3, write: 1 }} />);

    expect(heatmapEmpty).toContain('text-slate-400');
    expect(forecastMarkup).toContain('text-slate-900');
    expect(forecastMarkup).toContain('text-slate-500');
    expect(breakdownMarkup).toContain('text-slate-600');
    expect(breakdownMarkup).toContain('text-slate-900');
  });
});
