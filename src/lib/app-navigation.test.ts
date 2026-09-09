import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleNativeNavigation, navigateApp } from './app-navigation';

afterEach(() => vi.unstubAllGlobals());

describe('navigateApp', () => {
  it('dispatches native Back without leaking the previous lesson or review parameters', () => {
    const router = { push: vi.fn(), replace: vi.fn() };
    const target = new EventTarget();
    target.addEventListener('navigate', (event) =>
      handleNativeNavigation(event, 'https://echo-type.app/learn/unit?lesson=old&review=1&nativeQA=navigation', true, router),
    );
    const event = new Event('navigate');
    Object.assign(event, { detail: { path: '/learn', replace: true } });
    target.dispatchEvent(event);
    expect(router.replace).toHaveBeenCalledWith('/learn?nativeQA=navigation&nativeHost=ios');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('preserves destination query parameters in a native navigation event', () => {
    const router = { push: vi.fn(), replace: vi.fn() };
    const event = new Event('navigate');
    Object.assign(event, { detail: { path: '/learn/unit?lesson=new' } });
    handleNativeNavigation(event, 'https://echo-type.app/dashboard?lesson=old', true, router);
    expect(router.push).toHaveBeenCalledWith('/learn/unit?lesson=new&nativeHost=ios');
  });
  it('keeps normal web navigation without a native bridge', () => {
    const router = { push: vi.fn() };
    navigateApp('/journal', router);
    expect(router.push).toHaveBeenCalledWith('/journal');
  });

  it('hands the complete URL to native without navigating the source page', () => {
    const navigate = vi.fn(() => true);
    vi.stubGlobal('window', { EchoTypeNative: { navigate } });
    const router = { push: vi.fn() };
    navigateApp('/learn/unit?lesson=abc', router);
    expect(navigate).toHaveBeenCalledWith('/learn/unit?lesson=abc');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('uses Next routing when native declines a same-section route', () => {
    vi.stubGlobal('window', { EchoTypeNative: { navigate: () => false } });
    const router = { push: vi.fn() };
    navigateApp('/journal/123', router);
    expect(router.push).toHaveBeenCalledWith('/journal/123');
  });
});
