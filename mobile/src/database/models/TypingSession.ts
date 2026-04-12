import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export class TypingSession extends Model {
  static table = 'typing_sessions';

  @field('content_id') contentId!: string;
  @field('module_type') moduleType!: 'listen' | 'speak' | 'read' | 'write';
  @field('start_time') startTime!: number;
  @field('end_time') endTime?: number;
  @field('total_chars') totalChars!: number;
  @field('correct_chars') correctChars!: number;
  @field('incorrect_chars') incorrectChars!: number;
  @field('accuracy') accuracy!: number;
  @field('wpm') wpm!: number;
  @field('duration') duration!: number;
  @field('keystrokes') keystrokes!: string;
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
}
