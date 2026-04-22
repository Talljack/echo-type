export function shouldBypassOnboardingGate(isDev: boolean, flag?: string): boolean {
  return isDev && flag === '1';
}
