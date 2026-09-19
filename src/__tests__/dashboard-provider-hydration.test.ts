import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard provider setup notice', () => {
  it('waits for persisted provider configuration to hydrate before showing setup guidance', () => {
    const dashboardSource = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/dashboard/page.tsx'), 'utf8');

    expect(dashboardSource).toMatch(/const providerHydrated = useProviderStore/);
    expect(dashboardSource).toMatch(/\{providerHydrated && !hasProvider && \(/);
    expect(dashboardSource).toMatch(/\{providerHydrated && hasProvider && !activeProviderConnected && \(/);
  });
});
