import type Dexie from 'dexie';
import type { Table } from 'dexie';
import type { LearningAttempt } from '@/types/learning-activity';
import type { MediaBlobEntry } from './db';
import { recordingIdentity } from './learning-activity';

export async function persistLearningAttempt(
  database: Dexie & { learningAttempts: Table<LearningAttempt>; mediaBlobs: Table<MediaBlobEntry> },
  attempt: LearningAttempt,
  blob: Blob | undefined,
  isCurrent: () => boolean,
) {
  const guard = () => {
    if (!isCurrent()) throw new Error('Account changed');
  };
  guard();
  if (blob?.size) attempt.recordingId = await recordingIdentity(blob);
  guard();
  await database.transaction('rw', database.learningAttempts, database.mediaBlobs, async () => {
    guard();
    const existing = attempt.recordingId ? await database.mediaBlobs.get(attempt.recordingId) : undefined;
    guard();
    if (attempt.recordingId && blob && !existing)
      await database.mediaBlobs.add({
        contentId: attempt.recordingId,
        blob,
        mimeType: blob.type,
        createdAt: attempt.createdAt,
      });
    guard();
    await database.learningAttempts.add(attempt);
    guard();
  });
}
