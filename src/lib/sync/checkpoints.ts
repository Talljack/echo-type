export function clearSyncCheckpoints(
  userId: string,
  storage: Pick<Storage, 'length' | 'key' | 'removeItem' | 'getItem' | 'setItem'> = localStorage,
) {
  const prefix = `echotype_sync_table_v3_${userId}_`;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
  storage.removeItem(`echotype_last_synced_${userId}`);
  const epochKey = `echotype_sync_epoch_${userId}`;
  storage.setItem(epochKey, String(Number(storage.getItem(epochKey) ?? 0) + 1));
}
