import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';

export class Book extends Model {
  static table = 'books';

  @field('content_id') contentId!: string;
  @field('word') word!: string;
  @field('translation') translation?: string;
  @field('context') context?: string;
  @field('notes') notes?: string;
  @field('mastery_level') masteryLevel!: number;
  @field('review_count') reviewCount!: number;
  @date('last_reviewed_at') lastReviewedAt?: Date;
  @date('next_review_at') nextReviewAt?: Date;
  @json('tags', (json) => json) tags!: string[];
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
