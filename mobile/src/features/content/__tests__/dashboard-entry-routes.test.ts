import { getDashboardModuleRoute } from '../get-dashboard-module-route';

describe('getDashboardModuleRoute', () => {
  it('routes all modules to their dedicated tabs', () => {
    expect(getDashboardModuleRoute('listen')).toBe('/(tabs)/listen');
    expect(getDashboardModuleRoute('speak')).toBe('/(tabs)/speak');
    expect(getDashboardModuleRoute('read')).toBe('/(tabs)/read');
    expect(getDashboardModuleRoute('write')).toBe('/(tabs)/write');
  });
});
