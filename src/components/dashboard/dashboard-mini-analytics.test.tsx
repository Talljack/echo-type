import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: vi.fn(),
}));

describe('DashboardMiniAnalytics', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses the shared iOS card styling in the native host', async () => {
    const { detectIOSNativeHost } = await import('@/lib/tauri');
    vi.mocked(detectIOSNativeHost).mockReturnValue(true);

    const { DashboardMiniAnalytics } = await import('./dashboard-mini-analytics');

    const markup = renderToStaticMarkup(
      <DashboardMiniAnalytics
        messages={{
          activity: 'Activity',
          details: 'Details',
          reviewForecast: 'Review forecast',
          review: 'Review',
          practiceBreakdown: 'Practice breakdown',
        }}
        heatmapData={[{ date: '2026-06-01', count: 2 }]}
        reviewForecastData={[{ date: '2026-06-01', count: 3 }]}
        sessionsByModule={{ listen: 3, read: 1 }}
        totalSessions={4}
      />,
    );

    expect(markup).toContain('rounded-[26px]');
    expect(markup).toContain('bg-white/82');
  });
});
