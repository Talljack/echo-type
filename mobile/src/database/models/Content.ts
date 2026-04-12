import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';
import type { ContentType, DifficultyLevel } from '@/types';

export class Content extends Model {
  static table = 'contents';

  @field('title') title!: string;
  @field('type') type!: ContentType;
  @field('content') content!: string;
  @field('language') language!: string;
  @field('difficulty') difficulty!: DifficultyLevel;
  @json('tags', (json) => json) tags!: string[];
  @field('source') source?: string;
  @field('source_url') sourceUrl?: string;
  @field('cover_image') coverImage?: string;
  @field('duration') duration?: number;
  @field('word_count') wordCount?: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('last_accessed_at') lastAccessedAt?: Date;
  @field('is_favorite') isFavorite!: boolean;
  @field('progress') progress!: number;
  @json('metadata', (json) => json) metadata?: Record<string, any>;
  @date('synced_at') syncedAt?: Date;
  @field('is_deleted') isDeleted!: boolean;
}
