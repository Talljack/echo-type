export interface UpdaterDownloadEvent {
  event: string;
  data: {
    contentLength?: number;
    chunkLength?: number;
  };
}

interface InstallableUpdate {
  downloadAndInstall: (onEvent: (event: UpdaterDownloadEvent) => void) => Promise<void>;
}

export interface UpdaterDownloadState {
  status: 'downloading' | 'downloaded';
  downloadProgress: number;
}

export async function downloadAndInstallUpdate(
  update: InstallableUpdate,
  onStateChange: (state: UpdaterDownloadState) => void,
): Promise<void> {
  let totalBytes = 0;
  let downloadedBytes = 0;

  onStateChange({ status: 'downloading', downloadProgress: 0 });

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      totalBytes = event.data.contentLength || 0;
      return;
    }

    if (event.event === 'Progress') {
      downloadedBytes += event.data.chunkLength || 0;
      const downloadProgress = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
      onStateChange({ status: 'downloading', downloadProgress });
      return;
    }

    if (event.event === 'Finished') {
      // Tauri emits Finished when the network download ends, before signature
      // verification and the application bundle replacement have completed.
      onStateChange({ status: 'downloading', downloadProgress: 100 });
    }
  });

  onStateChange({ status: 'downloaded', downloadProgress: 100 });
}
