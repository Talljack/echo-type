export interface LocalModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface RemoteModel {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export class SyncMapper {
  static toRemote(local: LocalModel, userId: string): RemoteModel {
    return {
      id: local.id,
      user_id: userId,
      created_at: local.createdAt.toISOString(),
      updated_at: local.updatedAt.toISOString(),
    };
  }

  static toLocal(remote: RemoteModel): Partial<LocalModel> {
    return {
      id: remote.id,
      createdAt: new Date(remote.created_at),
      updatedAt: new Date(remote.updated_at),
    };
  }

  static contentToRemote(local: any, userId: string): any {
    return {
      ...SyncMapper.toRemote(local, userId),
      title: local.title,
      text: local.text,
      translation: local.translation,
      type: local.type,
      difficulty: local.difficulty,
      audio_url: local.audioUrl,
      book_id: local.bookId,
      metadata: local.metadata,
    };
  }

  static contentToLocal(remote: any): any {
    return {
      ...SyncMapper.toLocal(remote),
      title: remote.title,
      text: remote.text,
      translation: remote.translation,
      type: remote.type,
      difficulty: remote.difficulty,
      audioUrl: remote.audio_url,
      bookId: remote.book_id,
      metadata: remote.metadata,
    };
  }

  static learningRecordToRemote(local: any, userId: string): any {
    return {
      ...SyncMapper.toRemote(local, userId),
      content_id: local.contentId,
      stability: local.stability,
      difficulty: local.difficulty,
      elapsed_days: local.elapsedDays,
      scheduled_days: local.scheduledDays,
      reps: local.reps,
      lapses: local.lapses,
      state: local.state,
      last_review: local.lastReview?.toISOString(),
      due_date: local.dueDate?.toISOString(),
    };
  }

  static learningRecordToLocal(remote: any): any {
    return {
      ...SyncMapper.toLocal(remote),
      contentId: remote.content_id,
      stability: remote.stability,
      difficulty: remote.difficulty,
      elapsedDays: remote.elapsed_days,
      scheduledDays: remote.scheduled_days,
      reps: remote.reps,
      lapses: remote.lapses,
      state: remote.state,
      lastReview: remote.last_review ? new Date(remote.last_review) : null,
      dueDate: remote.due_date ? new Date(remote.due_date) : null,
    };
  }

  static bookToRemote(local: any, userId: string): any {
    return {
      ...SyncMapper.toRemote(local, userId),
      title: local.title,
      author: local.author,
      cover_url: local.coverUrl,
      description: local.description,
      metadata: local.metadata,
    };
  }

  static bookToLocal(remote: any): any {
    return {
      ...SyncMapper.toLocal(remote),
      title: remote.title,
      author: remote.author,
      coverUrl: remote.cover_url,
      description: remote.description,
      metadata: remote.metadata,
    };
  }
}
