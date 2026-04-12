import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'contents',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'language', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'tags', type: 'string' }, // JSON string
        { name: 'source', type: 'string', isOptional: true },
        { name: 'source_url', type: 'string', isOptional: true },
        { name: 'cover_image', type: 'string', isOptional: true },
        { name: 'duration', type: 'number', isOptional: true },
        { name: 'word_count', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_accessed_at', type: 'number', isOptional: true },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'progress', type: 'number' },
        { name: 'metadata', type: 'string', isOptional: true }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'learning_records',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module_type', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'accuracy', type: 'number', isOptional: true },
        { name: 'wpm', type: 'number', isOptional: true },
        { name: 'mistakes', type: 'number', isOptional: true },
        { name: 'completed_sentences', type: 'number' },
        { name: 'total_sentences', type: 'number' },
        { name: 'metadata', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'typing_sessions',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module_type', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'total_chars', type: 'number' },
        { name: 'correct_chars', type: 'number' },
        { name: 'incorrect_chars', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'wpm', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'keystrokes', type: 'string' }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'books',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'word', type: 'string', isIndexed: true },
        { name: 'translation', type: 'string', isOptional: true },
        { name: 'context', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'mastery_level', type: 'number' },
        { name: 'review_count', type: 'number' },
        { name: 'last_reviewed_at', type: 'number', isOptional: true },
        { name: 'next_review_at', type: 'number', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'conversations',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'messages', type: 'string' }, // JSON string
        { name: 'model', type: 'string' },
        { name: 'language', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'folder_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'favorite_folders',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
