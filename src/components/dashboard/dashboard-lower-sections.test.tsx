import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: vi.fn(),
}));

describe('Dashboard lower sections', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses shared iOS card styling for module cards and recent activity containers', async () => {
    const { detectIOSNativeHost } = await import('@/lib/tauri');
    vi.mocked(detectIOSNativeHost).mockReturnValue(true);

    const { DashboardModuleGrid } = await import('./dashboard-module-grid');
    const { DashboardRecentActivity } = await import('./dashboard-recent-activity');

    const gridMarkup = renderToStaticMarkup(
      <DashboardModuleGrid
        title="Start Learning"
        modules={[
          { href: '/listen', label: 'Listen', desc: 'Listen with TTS', color: 'bg-indigo-500', icon: 'listen' },
          { href: '/write', label: 'Write', desc: 'Typing practice', color: 'bg-purple-500', icon: 'write' },
        ]}
      />,
    );

    const recentMarkup = renderToStaticMarkup(
      <DashboardRecentActivity title="Recent Activity" emptyLabel="No sessions yet. Start practicing!" items={[]} />,
    );

    expect(gridMarkup).toContain('rounded-[26px]');
    expect(gridMarkup).toContain('bg-white/82');
    expect(recentMarkup).toContain('rounded-[26px]');
    expect(recentMarkup).toContain('bg-white/82');
  });
});
