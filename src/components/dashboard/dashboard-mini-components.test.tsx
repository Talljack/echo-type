import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Dashboard mini components', () => {
  it('shows activity context with fluid cells and local calendar dates', async () => {
    const { MiniHeatmap } = await import('./mini-heatmap');
    const markup = renderToStaticMarkup(
      <MiniHeatmap
        data={[
          { date: '2026-06-01', count: 2 },
          { date: '2026-06-02', count: 0 },
          { date: '2026-06-03', count: 3 },
        ]}
      />,
    );
    expect(markup).toContain('Last 8 weeks');
    expect(markup).toContain('Active days: 2');
    expect(markup).toContain('Jun 1');
    expect(markup).toContain('Jun 3');
    expect(markup).toContain('aspect-square');
    expect(markup).not.toContain('w-[10px]');
  });
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
});
