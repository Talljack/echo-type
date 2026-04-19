/**
 * Data management utilities for Settings → Data section.
 * - Export: bundle persisted stores + settings into a JSON file and share.
 * - Clear cache: wipe TTS audio cache.
 * - Delete all data: wipe every persisted store + signing out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { clearAudioCache, getCacheSize } from '@/lib/audio-cache';

const PERSISTED_KEYS = [
  'echotype_settings',
  'listen-store',
  'speak-store',
  'read-store',
  'write-store',
  'library-store',
  'dashboard-store',
  'review-store',
  'chat-store',
  'sync-store',
];

export async function getCacheSizeLabel(): Promise<string> {
  const bytes = await getCacheSize();
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb < 0.1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
}

export async function clearCache(): Promise<void> {
  await clearAudioCache();
}

export async function exportAllData(): Promise<void> {
  const payload: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const key of PERSISTED_KEYS) {
    try {
      const raw = await AsyncStorage.getItem(key);
      payload[key] = raw ? JSON.parse(raw) : null;
    } catch {
      payload[key] = null;
    }
  }

  const cacheDir = new Directory(Paths.cache);
  if (!cacheDir.exists) cacheDir.create();
  const file = new File(cacheDir, `echotype-export-${Date.now()}.json`);
  await file.write(JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export EchoType data' });
  }
}

export async function deleteAllLocalData(): Promise<void> {
  for (const key of PERSISTED_KEYS) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // keep going
    }
  }
  await clearAudioCache();
}
