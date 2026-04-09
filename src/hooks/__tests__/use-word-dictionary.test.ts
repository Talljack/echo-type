import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EffectCallback = () => void | (() => void);

const runtime = vi.hoisted(() => {
  type Cell =
    | { kind: 'state'; value: unknown }
    | { kind: 'ref'; value: { current: unknown } }
    | { kind: 'effect'; deps?: unknown[]; cleanup?: (() => void) | void };

  const cells: Cell[] = [];
  let cursor = 0;
  let currentHook: (() => unknown) | null = null;
  let currentResult: unknown;
  let isRendering = false;
  let isRunningEffects = false;
  let rerenderRequested = false;
  const pendingEffects: Array<{ effect: EffectCallback; index: number }> = [];

  function reset() {
    // Run cleanups
    for (const cell of cells) {
      if (cell.kind === 'effect' && typeof cell.cleanup === 'function') {
        cell.cleanup();
      }
    }
    cells.length = 0;
    cursor = 0;
    currentHook = null;
    currentResult = undefined;
    isRendering = false;
    isRunningEffects = false;
    rerenderRequested = false;
    pendingEffects.length = 0;
  }

  function areDepsEqual(a?: unknown[], b?: unknown[]) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => Object.is(value, b[index]));
  }

  function scheduleRender() {
    if (!currentHook) return;
    if (isRendering || isRunningEffects) {
      rerenderRequested = true;
      return;
    }
    render();
  }

  function render() {
    if (!currentHook) return;

    do {
      rerenderRequested = false;
      cursor = 0;
      pendingEffects.length = 0;
      isRendering = true;
      currentResult = currentHook();
      isRendering = false;

      isRunningEffects = true;
      while (pendingEffects.length > 0) {
        const item = pendingEffects.shift();
        if (!item) continue;
        const cell = cells[item.index];
        if (cell && cell.kind === 'effect' && typeof cell.cleanup === 'function') {
          cell.cleanup();
          cell.cleanup = undefined;
        }
        const cleanup = item.effect();
        if (cell && cell.kind === 'effect') {
          cell.cleanup = cleanup;
        }
      }
      isRunningEffects = false;
    } while (rerenderRequested);
  }

  function useState<T>(initialValue: T | (() => T)) {
    const index = cursor++;
    const existing = cells[index];

    if (!existing || existing.kind !== 'state') {
      cells[index] = {
        kind: 'state',
        value: typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue,
      };
    }

    const cell = cells[index];
    if (!cell || cell.kind !== 'state') throw new Error('Expected state cell');

    const setState = (nextValue: T | ((prev: T) => T)) => {
      const cell = cells[index];
      if (!cell || cell.kind !== 'state') return;
      const resolved = typeof nextValue === 'function' ? (nextValue as (prev: T) => T)(cell.value as T) : nextValue;
      if (Object.is(cell.value, resolved)) return;
      cell.value = resolved;
      scheduleRender();
    };

    return [cell.value as T, setState] as const;
  }

  function useRef<T>(initialValue: T) {
    const index = cursor++;
    const existing = cells[index];

    if (!existing || existing.kind !== 'ref') {
      cells[index] = { kind: 'ref', value: { current: initialValue } };
    }

    const cell = cells[index];
    if (!cell || cell.kind !== 'ref') throw new Error('Expected ref cell');

    return cell.value as { current: T };
  }

  function useEffect(effect: EffectCallback, deps?: unknown[]) {
    const index = cursor++;
    const existing = cells[index];
    const shouldRun = !existing || existing.kind !== 'effect' || !areDepsEqual(existing.deps, deps);

    if (shouldRun) {
      const cleanup = existing && existing.kind === 'effect' ? existing.cleanup : undefined;
      cells[index] = { kind: 'effect', deps: deps ? [...deps] : undefined, cleanup };
      pendingEffects.push({ effect, index });
    }
  }

  function renderHook<T>(hook: () => T) {
    currentHook = hook;
    render();

    return {
      get current() {
        return currentResult as T;
      },
      rerender(newHook?: () => T) {
        if (newHook) currentHook = newHook;
        render();
      },
    };
  }

  return { reset, renderHook, useState, useRef, useEffect };
});

vi.mock('react', () => ({
  useState: runtime.useState,
  useRef: runtime.useRef,
  useEffect: runtime.useEffect,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { useWordDictionary } = await import('../use-word-dictionary');

async function waitFor(assertion: () => void, timeoutMs = 2000) {
  const start = Date.now();
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

beforeEach(() => {
  runtime.reset();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useWordDictionary', () => {
  it('returns empty state when disabled', () => {
    const hook = runtime.renderHook(() => useWordDictionary('apple', 'zh-CN', false));
    expect(hook.current.translation).toBe('');
    expect(hook.current.phonetic).toBe('');
    expect(hook.current.pos).toBe('');
    expect(hook.current.meanings).toEqual([]);
    expect(hook.current.isLoading).toBe(false);
  });

  it('fetches dictionary + translation for single word', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [{ text: '/ˈæp.əl/' }],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      // /api/translate/free
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const hook = runtime.renderHook(() => useWordDictionary('apple', 'zh-CN', true));

    expect(hook.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(hook.current.phonetic).toBe('/ˈæp.əl/');
    expect(hook.current.pos).toBe('noun');
    expect(hook.current.translation).toBe('苹果');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetches translation only for multi-word phrases', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ translation: '红苹果' }),
    });

    const hook = runtime.renderHook(() => useWordDictionary('red apple', 'zh-CN', true));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(hook.current.translation).toBe('红苹果');
    expect(hook.current.phonetic).toBe('');
    expect(hook.current.pos).toBe('');
    // Only one fetch call (translate), no dictionary API call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles dictionary API 404 gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ title: 'No Definitions Found' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const hook = runtime.renderHook(() => useWordDictionary('apple', 'zh-CN', true));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(hook.current.phonetic).toBe('');
    expect(hook.current.pos).toBe('');
    expect(hook.current.translation).toBe('苹果');
  });

  it('uses fallback phonetics array when top-level phonetic is empty', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'hello',
                phonetic: '',
                phonetics: [{ text: '' }, { text: '/həˈloʊ/' }],
                meanings: [{ partOfSpeech: 'exclamation', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '你好' }),
      });
    });

    const hook = runtime.renderHook(() => useWordDictionary('hello', 'zh-CN', true));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(hook.current.phonetic).toBe('/həˈloʊ/');
    expect(hook.current.pos).toBe('exclamation');
  });

  it('caches results and does not re-fetch', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const hook = runtime.renderHook(() => useWordDictionary('apple', 'zh-CN', true));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Re-render with same args — should use cache
    hook.rerender();
    expect(mockFetch).toHaveBeenCalledTimes(2); // no new calls
    expect(hook.current.translation).toBe('苹果');
  });

  it('clears result when disabled', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    let enabled = true;
    const hook = runtime.renderHook(() => useWordDictionary('apple', 'zh-CN', enabled));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    enabled = false;
    hook.rerender();
    expect(hook.current.translation).toBe('');
    expect(hook.current.phonetic).toBe('');
    expect(hook.current.pos).toBe('');
    expect(hook.current.meanings).toEqual([]);
  });

  it('fetches multiple meanings with batch translation', async () => {
    mockFetch.mockImplementation((url: string, options?: { body?: string }) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'prompt',
                phonetic: '/pɹɒmpt/',
                phonetics: [{ text: '/pɹɒmpt/' }],
                meanings: [
                  {
                    partOfSpeech: 'noun',
                    definitions: [{ definition: 'A reminder or cue.' }, { definition: 'A time limit.' }],
                  },
                  {
                    partOfSpeech: 'verb',
                    definitions: [{ definition: 'To lead someone toward what they should say or do.' }],
                  },
                  {
                    partOfSpeech: 'adjective',
                    definitions: [{ definition: 'Quick; acting without delay.' }],
                  },
                ],
              },
            ]),
        });
      }
      const body = options?.body ? JSON.parse(options.body) : {};
      if (body.sentences) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              translations: body.sentences.map((s: string) => {
                if (s.includes('reminder')) return '提醒或暗示。';
                if (s.includes('time limit')) return '时间限制。';
                if (s.includes('lead someone')) return '引导某人说或做应该做的事。';
                if (s.includes('Quick')) return '迅速的；毫不拖延的。';
                return '';
              }),
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '提示' }),
      });
    });

    const hook = runtime.renderHook(() => useWordDictionary('prompt', 'zh-CN', true));

    await waitFor(() => {
      expect(hook.current.isLoading).toBe(false);
    });

    expect(hook.current.phonetic).toBe('/pɹɒmpt/');
    expect(hook.current.pos).toBe('noun');
    expect(hook.current.translation).toBe('提示');
    expect(hook.current.meanings).toHaveLength(3);
    expect(hook.current.meanings[0].pos).toBe('noun');
    expect(hook.current.meanings[0].definition).toContain('提醒或暗示');
    expect(hook.current.meanings[1].pos).toBe('verb');
    expect(hook.current.meanings[2].pos).toBe('adjective');
  });
});
