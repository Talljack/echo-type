import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export class LearningRecord extends Model {
  static table = 'learning_records';

  @field('content_id') contentId!: string;
  @field('module_type') moduleType!: 'listen' | 'speak' | 'read' | 'write';
  @field('start_time') startTime!: number;
  @field('end_time') endTime?: number;
  @field('duration') duration!: number;
  @field('accuracy') accuracy?: number;
  @field('wpm') wpm?: number;
  @field('mistakes') mistakes?: number;
  @field('completed_sentences') completedSentences!: number;
  @field('total_sentences') totalSentences!: number;
  @field('metadata') metadata?: string;
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
}
