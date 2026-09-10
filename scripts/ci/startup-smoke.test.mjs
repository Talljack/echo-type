import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';
import { runSmoke } from './startup-smoke.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const fixture = (port, status = 200) => [
  '-e',
  `require('http').createServer((req,res)=>{res.writeHead(${status});res.end('EchoType')}).listen(${port},'127.0.0.1')`,
];

test('real server becomes ready and stays alive', async () => {
  const port = await freePort();
  await runSmoke(process.execPath, fixture(port), { port, observeMs: 200, timeoutMs: 2000 });
});

test('an early exit cannot pass even with exit code zero', async () => {
  await assert.rejects(
    runSmoke(process.execPath, ['-e', 'process.exit(0)'], { port: await freePort(), timeoutMs: 1000 }),
    /exited/,
  );
});

test('an unrelated listener cannot satisfy readiness', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(runSmoke(process.execPath, [], { port: server.address().port }), /occupied/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('HTTP errors fail readiness', async () => {
  const port = await freePort();
  await assert.rejects(runSmoke(process.execPath, fixture(port, 500), { port, timeoutMs: 400 }), /not ready/);
});
