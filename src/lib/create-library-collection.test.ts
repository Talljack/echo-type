import { describe, expect, it } from 'vitest';
import { buildLibraryCollection } from './create-library-collection';

describe('buildLibraryCollection', () => {
  it('creates a user collection from selected content in selection order', () => {
    const collection = buildLibraryCollection('Travel essentials', ['b', 'a']);

    expect(collection.title).toBe('Travel essentials');
    expect(collection.itemIds).toEqual(['b', 'a']);
    expect(collection.source).toBe('user-created');
  });
});
