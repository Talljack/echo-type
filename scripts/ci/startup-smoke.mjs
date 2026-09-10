import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// CI-only probe. Never attach to an existing local user session/server.
export async function runSmoke(executable, args, options = {}) {
  const { port = 54576, timeoutMs = 30000, observeMs = 60000, browser = false } = options;
  const reservation = createServer();
  await new Promise((accept, reject) => {
    reservation.once('error', () => reject(new Error(`Port ${port} occupied before launch`)));
    reservation.listen(port, '127.0.0.1', accept);
  });
  await new Promise((accept) => reservation.close(accept));
  const child = spawn(executable, args, {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' },
  });
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  const assertAlive = () => {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`App exited: code=${child.exitCode}, signal=${child.signalCode}`);
    }
  };
  const origin = `http://127.0.0.1:${port}`;
  let browserProcess;
  try {
    const deadline = Date.now() + timeoutMs;
    let ready = false;
    while (Date.now() < deadline) {
      assertAlive();
      try {
        const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* wait for the application's own server */
      }
      await delay(100);
    }
    if (!ready) throw new Error(`App not ready within ${timeoutMs}ms`);
    assertAlive();
    if (browser) {
      const { chromium, expect } = await import('@playwright/test');
      browserProcess = await chromium.launch();
      const page = await browserProcess.newPage({ locale: 'en-US' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await mkdir('startup-artifacts', { recursive: true });
      for (const route of ['/dashboard', '/library']) {
        try {
          const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (!response?.ok()) throw new Error(`${route}: HTTP ${response?.status()}`);
          // IndexedDB initialization can outlive network idle. Wait for real
          // application content rather than inspecting the loading skeleton.
          const heading = route === '/dashboard' ? 'What to practice today' : 'Content Library';
          await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 30000 });
          await expect
            .poll(async () => (await page.locator('main').innerText()).trim().length, {
              timeout: 30000,
            })
            .toBeGreaterThan(20);
        } finally {
          await page.screenshot({ path: `startup-artifacts${route}.png`, fullPage: true });
        }
      }
      if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    }
    const until = Date.now() + observeMs;
    while (Date.now() < until) {
      assertAlive();
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`Server stopped responding: HTTP ${response.status}`);
      await delay(Math.min(1000, Math.max(1, until - Date.now())));
    }
    assertAlive();
    console.log(
      `PASS: ${executable}; HTTP ready, app alive for ${observeMs}ms${browser ? ', dashboard/library rendered' : ''}`,
    );
  } finally {
    await browserProcess?.close();
    if (child.pid) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'inherit' });
      } else {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* already exited */
        }
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [executable, ...args] = process.argv.slice(2);
  if (!executable) throw new Error('Usage: node startup-smoke.mjs <executable> [args...]');
  await runSmoke(executable, args, { port: Number(process.env.SMOKE_PORT || 54576), browser: true });
}
