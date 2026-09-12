import { defineConfig, devices } from '@playwright/test';

// Exercise the built app, not a separately compiled development server.
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'daily-task-queue.spec.ts',
    'durable-import.spec.ts',
    'lesson-workshop.spec.ts',
    'favorites-review-queue.spec.ts',
    'p0-backup.spec.ts',
    'course-typing.spec.ts',
    'inline-practice-translation.spec.ts',
    'learning-migration.spec.ts',
    'learning-navigation.spec.ts',
    'activity-layout.spec.ts',
    'storage-capability.spec.ts',
  ],
  timeout: 60000,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/verification.json' }]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:54578', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
