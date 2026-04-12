import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export class FavoriteFolder extends Model {
  static table = 'favorite_folders';

  @field('name') name!: string;
  @field('color') color?: string;
  @field('icon') icon?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
