import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export class Favorite extends Model {
  static table = 'favorites';

  @field('content_id') contentId!: string;
  @field('folder_id') folderId?: string;
  @readonly @date('created_at') createdAt!: Date;
}
