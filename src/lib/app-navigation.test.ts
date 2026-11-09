import { describe, expect, it, vi } from 'vitest';
import { navigateApp } from './app-navigation';

describe('navigateApp', () => {
  it('pushes the route through the Next router', () => {
    const router = { push: vi.fn() };
    navigateApp('/journal', router);
    expect(router.push).toHaveBeenCalledWith('/journal');
  });

  it('preserves destination query parameters', () => {
    const router = { push: vi.fn() };
    navigateApp('/learn/unit?lesson=abc', router);
    expect(router.push).toHaveBeenCalledWith('/learn/unit?lesson=abc');
  });
});
