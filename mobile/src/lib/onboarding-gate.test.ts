import { shouldBypassOnboardingGate } from './onboarding-gate';

describe('shouldBypassOnboardingGate', () => {
  it('returns true only when development mode and the explicit flag are both enabled', () => {
    expect(shouldBypassOnboardingGate(true, '1')).toBe(true);
    expect(shouldBypassOnboardingGate(true, '0')).toBe(false);
    expect(shouldBypassOnboardingGate(true, undefined)).toBe(false);
    expect(shouldBypassOnboardingGate(false, '1')).toBe(false);
  });
});
