import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const versionArg = args.find((arg) => arg !== '--dry-run');

if (!versionArg) {
  console.error('Usage: node scripts/set-release-version.mjs <version|vX.Y.Z> [--dry-run]');
  process.exit(1);
}

const normalizedVersion = versionArg.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(normalizedVersion)) {
  console.error(`Invalid version: ${versionArg}`);
  process.exit(1);
}

const projectRoot = process.cwd();

const packageJsonPath = path.join(projectRoot, 'package.json');
const tauriConfigPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = normalizedVersion;

const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
tauriConfig.version = normalizedVersion;

const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8').replace(
  /^version = ".*"$/m,
  `version = "${normalizedVersion}"`,
);

if (dryRun) {
  console.log(`package.json -> ${normalizedVersion}`);
  console.log(`src-tauri/tauri.conf.json -> ${normalizedVersion}`);
  console.log(`src-tauri/Cargo.toml -> ${normalizedVersion}`);
  process.exit(0);
}

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
fs.writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
fs.writeFileSync(cargoTomlPath, cargoToml);

console.log(`Release version synced to ${normalizedVersion}`);
