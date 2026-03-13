import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWordBookItems } from './load-items';
import { getWordBook } from './index';

// ─── loadWordBookItems ──────────────────────────────────────────────────────

describe('loadWordBookItems', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── JSON path ──────────────────────────────────────────────────────────────

  it('loads items from JSON when fetch succeeds', async () => {
    const jsonData = [
      { word: 'hello', sentence: 'Hello, how are you?' },
      { word: 'world', sentence: 'The world is beautiful.' },
    ];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(jsonData),
    });

    const items = await loadWordBookItems('cet4');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('hello');
    expect(items[0].text).toBe('Hello, how are you?');
    expect(items[0].type).toBe('word');
    expect(items[0].category).toBe('cet4');
    expect(items[0].tags).toEqual(['cet4']);
    expect(items[0].source).toBe('builtin');
  });

  it('uses book difficulty for JSON-loaded items', async () => {
    const jsonData = [{ word: 'test', sentence: 'This is a test.' }];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(jsonData),
    });

    const book = getWordBook('cet4');
    const items = await loadWordBookItems('cet4');
    expect(items[0].difficulty).toBe(book?.difficulty);
  });

  it('uses word as text when sentence is empty', async () => {
    const jsonData = [{ word: 'cat', sentence: '' }];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(jsonData),
    });

    const items = await loadWordBookItems('cet4');
    expect(items[0].text).toBe('cat');
  });

  // ── Inline fallback path ───────────────────────────────────────────────────

  it('falls back to inline items when fetch returns non-ok', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const items = await loadWordBookItems('airport');
    // airport is a scenario book with inline items
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].title).toBeTruthy();
    expect(items[0].text).toBeTruthy();
  });

  it('falls back to inline items when fetch throws', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );

    const items = await loadWordBookItems('airport');
    expect(items.length).toBeGreaterThan(0);
  });

  // ── Unknown book ───────────────────────────────────────────────────────────

  it('returns empty array for unknown bookId when fetch fails', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const items = await loadWordBookItems('nonexistent-book');
    expect(items).toEqual([]);
  });

  it('defaults difficulty to intermediate for unknown book via JSON', async () => {
    const jsonData = [{ word: 'x', sentence: 'X marks the spot.' }];

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(jsonData),
    });

    const items = await loadWordBookItems('unknown-book-id');
    expect(items[0].difficulty).toBe('intermediate');
  });
});
