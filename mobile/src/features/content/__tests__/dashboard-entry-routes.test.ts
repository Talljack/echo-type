import { getDashboardModuleRoute } from '../get-dashboard-module-route';

describe('getDashboardModuleRoute', () => {
  it('routes read and write to the library picker intent', () => {
    expect(getDashboardModuleRoute('read')).toBe('/(tabs)/library?mode=read');
    expect(getDashboardModuleRoute('write')).toBe('/(tabs)/library?mode=write');
  });

  it('routes listen and speak to their module tabs', () => {
    expect(getDashboardModuleRoute('listen')).toBe('/(tabs)/listen');
    expect(getDashboardModuleRoute('speak')).toBe('/(tabs)/speak');
  });
});
