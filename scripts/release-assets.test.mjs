import assert from 'node:assert/strict';
import test from 'node:test';
import { selectUpdaterAssets } from './release-assets.mjs';

const names = ['EchoType.app.tar.gz', 'EchoType_1.4.0_amd64.AppImage', 'EchoType_1.4.0_x64-setup.exe'];
const assets = names.flatMap((name) => [{ name }, { name: `${name}.sig` }]);

test('selects signed Tauri v2 native installers for all shipped architectures', () => {
  const selected = selectUpdaterAssets(assets, '1.4.0');
  assert.deepEqual(Object.keys(selected), ['darwin-aarch64', 'linux-x86_64', 'windows-x86_64']);
  assert.equal(selected['windows-x86_64'].asset.name, names[2]);
  assert.equal(selected['linux-x86_64'].asset.name, names[1]);
  assert.equal(selected['darwin-x86_64'], undefined);
});

test('refuses an incomplete release or a mismatched version', () => {
  assert.throws(() => selectUpdaterAssets(assets.slice(0, -1), '1.4.0'), /signature/);
  assert.throws(() => selectUpdaterAssets(assets, '1.4.1'), /Missing/);
});
