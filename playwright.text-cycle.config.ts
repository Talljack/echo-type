import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3011';
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'all-material-learning-chains.spec.ts',
    'import-real-materials.spec.ts',
    'import-vocabulary-learning.spec.ts',
    'import-reliability-real.spec.ts',
    'import-design-fidelity.spec.ts',
    'import-v2.spec.ts',
    'import-states.spec.ts',
    'book-import-learning-chain.spec.ts',
    'large-epub-import.spec.ts',
    'material-editors.spec.ts',
    'import-workbench.spec.ts',
    'material-workspace.spec.ts',
    'unified-library.spec.ts',
    'vocabulary-cycle.spec.ts',
    'text-learning-cycle.spec.ts',
    'text-cycle-recovery.spec.ts',
    'text-cycle-order.spec.ts',
    'media-recording-storage.spec.ts',
    'durable-import.spec.ts',
    'daily-task-queue.spec.ts',
  ],
  timeout: 60000,
  grepInvert: process.env.ECHOTYPE_LIVE_IMPORTS === '1' ? undefined : /live .*URL|live Mozilla PDF/,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/text-cycle.json' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.platform === 'win32' ? [] : [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }]),
  ],
  webServer: {
    command: 'pnpm start --hostname 127.0.0.1 --port 3011',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
