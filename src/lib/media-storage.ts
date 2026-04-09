import { db, type MediaBlobEntry } from './db';

const blobUrlCache = new Map<string, string>();

export async function saveMediaBlob(contentId: string, file: File | Blob): Promise<void> {
  const entry: MediaBlobEntry = {
    contentId,
    blob: file instanceof File ? new Blob([file], { type: file.type }) : file,
    mimeType: file.type || 'audio/mpeg',
    createdAt: Date.now(),
  };
  await db.mediaBlobs.put(entry);
}

export async function getMediaBlobUrl(contentId: string): Promise<string | null> {
  const cached = blobUrlCache.get(contentId);
  if (cached) {
    try {
      const response = await fetch(cached);
      if (response.ok) return cached;
    } catch {
      blobUrlCache.delete(contentId);
    }
  }

  try {
    const entry = await db.mediaBlobs.get(contentId);
    if (!entry) return null;
    const url = URL.createObjectURL(entry.blob);
    blobUrlCache.set(contentId, url);
    return url;
  } catch {
    return null;
  }
}

export async function deleteMediaBlob(contentId: string): Promise<void> {
  const cached = blobUrlCache.get(contentId);
  if (cached) {
    URL.revokeObjectURL(cached);
    blobUrlCache.delete(contentId);
  }
  await db.mediaBlobs.delete(contentId);
}

export async function hasMediaBlob(contentId: string): Promise<boolean> {
  const count = await db.mediaBlobs.where('contentId').equals(contentId).count();
  return count > 0;
}
