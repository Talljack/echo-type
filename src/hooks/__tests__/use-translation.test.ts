import { beforeEach, describe, expect, it, vi } from 'vitest';

type EffectCallback = () => void | (() => void);

const runtime = vi.hoisted(() => {
  type Cell =
    | { kind: 'state'; value: unknown }
    | { kind: 'ref'; value: { current: unknown } }
    | { kind: 'callback'; value: unknown; deps?: unknown[] }
    | { kind: 'effect'; deps?: unknown[] };

  const cells: Cell[] = [];
  let cursor = 0;
  let currentHook: (() => unknown) | null = null;
  let currentResult: unknown;
  let isRendering = false;
  let isRunningEffects = false;
  let rerenderRequested = false;
  const pendingEffects: EffectCallback[] = [];

  function reset() {
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
        const effect = pendingEffects.shift();
        effect?.();
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
    if (!cell || cell.kind !== 'state') {
      throw new Error('Expected state cell');
    }

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
    if (!cell || cell.kind !== 'ref') {
      throw new Error('Expected ref cell');
    }

    return cell.value as { current: T };
  }

  function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: unknown[]) {
    const index = cursor++;
    const existing = cells[index];

    if (!existing || existing.kind !== 'callback' || !areDepsEqual(existing.deps, deps)) {
      cells[index] = { kind: 'callback', value: callback, deps: deps ? [...deps] : undefined };
    }

    const cell = cells[index];
    if (!cell || cell.kind !== 'callback') {
      throw new Error('Expected callback cell');
    }

    return cell.value as T;
  }

  function useEffect(effect: EffectCallback, deps?: unknown[]) {
    const index = cursor++;
    const existing = cells[index];
    const shouldRun = !existing || existing.kind !== 'effect' || !areDepsEqual(existing.deps, deps);

    if (shouldRun) {
      cells[index] = { kind: 'effect', deps: deps ? [...deps] : undefined };
      pendingEffects.push(effect);
    }
  }

  function renderHook<T>(hook: () => T) {
    currentHook = hook;
    render();

    return {
      get current() {
        return currentResult as T;
      },
    };
  }

  return { reset, renderHook, useState, useRef, useCallback, useEffect };
});

vi.mock('react', () => ({
  useState: runtime.useState,
  useRef: runtime.useRef,
  useCallback: runtime.useCallback,
  useEffect: runtime.useEffect,
}));

vi.mock('@/stores/provider-store', () => ({
  useProviderStore: (() => {
    const store = {
      activeProviderId: 'openai',
      providers: {
        openai: {
          auth: { apiKey: 'test-key' },
        },
      },
    };

    return (selector: (state: typeof store) => unknown) => selector(store);
  })(),
}));

vi.mock('@/lib/providers', () => ({
  PROVIDER_REGISTRY: {
    openai: {
      headerKey: 'Authorization',
    },
  },
}));

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

const { useTranslation } = await import('../use-translation');

async function waitFor(assertion: () => void, timeoutMs = 2000) {
  const start = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

describe('useTranslation', () => {
  beforeEach(() => {
    runtime.reset();
    fetchMock.mockReset();
  });

  it('prefetches sentence translations even when the page starts hidden', async () => {
    fetchMock.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          translations: ['垃圾。', '把垃圾倒出去。'],
          engine: 'google-free',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const hook = runtime.renderHook(() =>
      useTranslation('trash. Take out the trash.', 'zh-CN', {
        shouldPrefetch: true,
        visible: false,
      }),
    );

    await waitFor(() => {
      expect(hook.current.sentenceTranslations).toEqual([
        { original: 'trash.', translation: '垃圾。' },
        { original: 'Take out the trash.', translation: '把垃圾倒出去。' },
      ]);
      expect(hook.current.isReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/translate/free',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: ['trash.', 'Take out the trash.'],
          targetLang: 'zh-CN',
        }),
      }),
    );
  });
});
