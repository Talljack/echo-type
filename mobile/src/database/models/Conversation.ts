import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';

export class Conversation extends Model {
  static table = 'conversations';

  @field('title') title!: string;
  @json('messages', (json) => json) messages!: any[];
  @field('model') model!: string;
  @field('language') language!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;
}
