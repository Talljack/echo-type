import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop release authentication config', () => {
  it('injects and validates Supabase public config before building the frontend', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/release-desktop.yml'), 'utf8');

    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_URL:');
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY:');
    expect(workflow).toContain('node scripts/validate-public-env.mjs');
  });

  it('fails closed when the public auth config is missing', () => {
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = spawnSync(process.execPath, ['scripts/validate-public-env.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('accepts an HTTPS Supabase public config without printing the key', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-public-env.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key',
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('public-test-key');
  });
});
