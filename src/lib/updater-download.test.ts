import { describe, expect, it, vi } from 'vitest';
import {
  downloadAndInstallUpdate,
  type UpdaterDownloadEvent,
} from '@/lib/updater-download';

describe('desktop updater download lifecycle', () => {
  it('does not expose restart until installation has actually completed', async () => {
    let finishInstallation: (() => void) | undefined;
    const installationPending = new Promise<void>((resolve) => {
      finishInstallation = resolve;
    });
    const states: Array<{ status: 'downloading' | 'downloaded'; downloadProgress: number }> = [];

    const update = {
      downloadAndInstall: vi.fn(async (onEvent: (event: UpdaterDownloadEvent) => void) => {
        onEvent({ event: 'Started', data: { contentLength: 100 } });
        onEvent({ event: 'Progress', data: { chunkLength: 100 } });
        onEvent({ event: 'Finished', data: {} });
        await installationPending;
      }),
    };

    const result = downloadAndInstallUpdate(update, (state) => states.push(state));
    await Promise.resolve();

    expect(states.at(-1)).toEqual({ status: 'downloading', downloadProgress: 100 });
    expect(states).not.toContainEqual({ status: 'downloaded', downloadProgress: 100 });

    finishInstallation?.();
    await result;

    expect(states.at(-1)).toEqual({ status: 'downloaded', downloadProgress: 100 });
  });
});
