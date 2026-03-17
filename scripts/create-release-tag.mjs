import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const rawTarget = args.find((arg) => arg !== '--dry-run');

if (!rawTarget) {
  console.error('Usage: node scripts/create-release-tag.mjs <patch|minor|major|X.Y.Z|vX.Y.Z> [--dry-run]');
  process.exit(1);
}

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const currentVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function normalizeVersion(value) {
  return value.replace(/^v/, '');
}

function bumpVersion(version, releaseType) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)?$/);

  if (!match) {
    throw new Error(`Unsupported current version: ${version}`);
  }

  const [, majorPart, minorPart, patchPart] = match;
  let major = Number(majorPart);
  let minor = Number(minorPart);
  let patch = Number(patchPart);

  if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else if (releaseType === 'patch') {
    patch += 1;
  } else {
    throw new Error(`Unsupported release type: ${releaseType}`);
  }

  return `${major}.${minor}.${patch}`;
}

function resolveTargetVersion(target) {
  if (['patch', 'minor', 'major'].includes(target)) {
    return bumpVersion(currentVersion, target);
  }

  const normalized = normalizeVersion(target);

  if (!/^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Invalid release target: ${target}`);
  }

  return normalized;
}

function ensureCleanWorktree() {
  const status = run('git', ['status', '--porcelain']);

  if (status) {
    throw new Error('Working tree is not clean. Commit or stash your changes before releasing.');
  }
}

function ensureMainBranch() {
  const branch = run('git', ['branch', '--show-current']);

  if (branch !== 'main') {
    throw new Error(`Releases must be created from main. Current branch: ${branch}`);
  }
}

function ensureTagDoesNotExist(tagName) {
  const tags = run('git', ['tag', '--list', tagName]);

  if (tags) {
    throw new Error(`Tag already exists: ${tagName}`);
  }
}

const nextVersion = resolveTargetVersion(rawTarget);
const tagName = `v${nextVersion}`;

try {
  if (!dryRun) {
    ensureCleanWorktree();
    ensureMainBranch();
    ensureTagDoesNotExist(tagName);
  } else {
    try {
      ensureCleanWorktree();
    } catch (error) {
      console.log(`warning: ${error.message}`);
    }

    try {
      ensureMainBranch();
    } catch (error) {
      console.log(`warning: ${error.message}`);
    }

    try {
      ensureTagDoesNotExist(tagName);
    } catch (error) {
      console.log(`warning: ${error.message}`);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const releaseSteps = [
  ['node', ['scripts/set-release-version.mjs', nextVersion]],
  ['git', ['add', 'package.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml']],
  ['git', ['commit', '-m', `chore: release ${tagName}`]],
  ['git', ['tag', '-a', tagName, '-m', `Release ${tagName}`]],
  ['git', ['push', 'origin', 'main']],
  ['git', ['push', 'origin', tagName]],
];

if (dryRun) {
  console.log(`Current version: ${currentVersion}`);
  console.log(`Next version: ${nextVersion}`);
  console.log(`Tag: ${tagName}`);
  for (const [command, commandArgs] of releaseSteps) {
    console.log(`${command} ${commandArgs.join(' ')}`);
  }
  process.exit(0);
}

for (const [command, commandArgs] of releaseSteps) {
  execFileSync(command, commandArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

console.log(`Release ${tagName} created and pushed.`);
