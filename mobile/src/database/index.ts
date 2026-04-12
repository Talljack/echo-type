import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import * as models from './models';
import { schema } from './schema';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'echotype',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: Object.values(models),
});

export * from './models';
export { schema };
