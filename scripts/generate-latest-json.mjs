#!/usr/bin/env node

/**
 * Generate latest.json for Tauri v2 updater.
 *
 * Usage: node scripts/generate-latest-json.mjs v0.2.0
 *
 * Requires: `gh` CLI authenticated with repo access.
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'Talljack/echo-type';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/generate-latest-json.mjs <tag>');
  process.exit(1);
}

const version = tag.replace(/^v/, '');

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf-8' }).trim();
}

function getAssets() {
  const json = gh(`release view ${tag} --repo ${REPO} --json assets,body`);
  return JSON.parse(json);
}

// Map platform keys to asset name patterns
const PLATFORM_MAP = {
  'darwin-aarch64': { ext: '.app.tar.gz', sig: '.app.tar.gz.sig' },
  'darwin-x86_64': { ext: '.app.tar.gz', sig: '.app.tar.gz.sig' },
  'linux-x86_64': { ext: '.AppImage.tar.gz', sig: '.AppImage.tar.gz.sig' },
  'windows-x86_64': { ext: '.nsis.zip', sig: '.nsis.zip.sig' },
};

function main() {
  console.log(`Generating latest.json for ${tag}...`);

  const release = getAssets();
  const assets = release.assets;
  const notes = release.body || '';

  const tmpDir = mkdtempSync(join(tmpdir(), 'tauri-latest-'));

  const platforms = {};

  for (const [platform, { ext, sig: sigExt }] of Object.entries(PLATFORM_MAP)) {
    // Find the matching asset
    const asset = assets.find((a) => a.name.endsWith(ext));
    const sigAsset = assets.find((a) => a.name.endsWith(sigExt));

    if (!asset || !sigAsset) {
      console.warn(`  Skipping ${platform}: no matching asset found (looking for *${ext})`);
      continue;
    }

    // Download the .sig file to read its content
    try {
      execSync(`gh release download ${tag} --repo ${REPO} --pattern "${sigAsset.name}" --dir "${tmpDir}"`, {
        stdio: 'pipe',
      });
      const signature = readFileSync(join(tmpDir, sigAsset.name), 'utf-8').trim();

      platforms[platform] = {
        signature,
        url: `https://github.com/${REPO}/releases/download/${tag}/${asset.name}`,
      };

      console.log(`  ${platform}: ${asset.name}`);
    } catch (err) {
      console.warn(`  Skipping ${platform}: failed to download signature — ${err.message}`);
    }
  }

  if (Object.keys(platforms).length === 0) {
    console.error('No platform artifacts found. Aborting.');
    process.exit(1);
  }

  const latestJson = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms,
  };

  const outPath = join(tmpDir, 'latest.json');
  writeFileSync(outPath, JSON.stringify(latestJson, null, 2));

  console.log(`\nUploading latest.json to release ${tag}...`);
  execSync(`gh release upload ${tag} "${outPath}" --repo ${REPO} --clobber`, { stdio: 'inherit' });

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  console.log('Done.');
}

main();
