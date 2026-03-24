#!/bin/bash
# Build script for Tauri production build
# This script builds Next.js in standalone mode and prepares the output for Tauri
# Works on macOS, Linux, and Windows (Git Bash)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TAURI_BINARIES_DIR="$PROJECT_DIR/src-tauri/binaries"

# Detect Windows (Git Bash / MSYS2)
if [[ "${OSTYPE:-}" == msys* ]] || [[ "${OSTYPE:-}" == cygwin* ]] || [[ "${OS:-}" == "Windows_NT" ]]; then
  NODE_EXE="node.exe"
else
  NODE_EXE="node"
fi

TAURI_NODE_TARGET="$TAURI_BINARIES_DIR/$NODE_EXE"

prepare_node_runtime() {
  local source_path="${TAURI_BUNDLED_NODE_PATH:-}"

  if [ -z "$source_path" ]; then
    source_path="$(command -v node || true)"
  fi

  mkdir -p "$TAURI_BINARIES_DIR"

  if [ -n "$source_path" ]; then
    # On Windows Git Bash, command -v may omit .exe
    if [ ! -f "$source_path" ] && [ -f "${source_path}.exe" ]; then
      source_path="${source_path}.exe"
    fi

    echo "==> Bundling Node.js runtime from: $source_path"
    cp -f "$source_path" "$TAURI_NODE_TARGET"
    chmod +x "$TAURI_NODE_TARGET" 2>/dev/null || true
    return
  fi

  if [ -f "$TAURI_NODE_TARGET" ]; then
    echo "==> Reusing existing bundled Node.js runtime: $TAURI_NODE_TARGET"
    return
  fi

  echo "ERROR: Unable to find a Node.js runtime to bundle."
  echo "Set TAURI_BUNDLED_NODE_PATH=/absolute/path/to/node or install Node.js locally."
  exit 1
}

prepare_node_runtime

echo "==> Building Next.js in standalone mode..."
cd "$PROJECT_DIR"
TAURI_ENV=1 pnpm next build

STANDALONE_DIR="$PROJECT_DIR/.next/standalone"
TAURI_RESOURCES_DIR="$PROJECT_DIR/src-tauri/resources"
TAURI_STANDALONE_DIR="$TAURI_RESOURCES_DIR/standalone"
PROJECT_PNPM_DIR="$PROJECT_DIR/node_modules/.pnpm"

if [ ! -d "$STANDALONE_DIR" ]; then
  echo "ERROR: Standalone output not found at $STANDALONE_DIR"
  echo "Make sure next.config.ts has output: 'standalone' when TAURI_ENV=1"
  exit 1
fi

echo "==> Preparing clean Tauri standalone resources..."
mkdir -p "$TAURI_RESOURCES_DIR"
mkdir -p "$TAURI_STANDALONE_DIR"

# Copy standalone output with full symlink dereferencing (cross-platform)
# Uses Node.js fs.cpSync which handles pnpm symlink structures correctly
echo "==> Copying standalone runtime files into Tauri resources..."
rm -rf "$TAURI_STANDALONE_DIR"
mkdir -p "$TAURI_STANDALONE_DIR"
node -e "
const fs = require('fs'), path = require('path');
const src = process.argv[1], dst = process.argv[2];
const items = ['server.js', 'package.json', 'node_modules', '.next'];
let skipped = 0;
for (const name of items) {
  const s = path.join(src, name);
  if (!fs.existsSync(s)) continue;
  const d = path.join(dst, name);
  const stat = fs.lstatSync(s);
  if (stat.isFile()) {
    fs.copyFileSync(s, d);
  } else if (stat.isDirectory()) {
    fs.cpSync(s, d, {
      recursive: true,
      dereference: true,
      filter: (source) => {
        try {
          const lst = fs.lstatSync(source);
          if (lst.isSymbolicLink()) { fs.statSync(source); }
          return true;
        } catch { skipped++; return false; }
      }
    });
  }
}
// Flatten pnpm virtual store: hoist all nested packages to top-level node_modules
// so Node.js module resolution works after symlink dereferencing.
const nodeModules = path.join(dst, 'node_modules');
const pnpmDir = path.join(nodeModules, '.pnpm');
if (fs.existsSync(pnpmDir)) {
  let hoisted = 0;
  for (const store of fs.readdirSync(pnpmDir)) {
    const storeNM = path.join(pnpmDir, store, 'node_modules');
    if (!fs.existsSync(storeNM) || !fs.statSync(storeNM).isDirectory()) continue;
    for (const pkg of fs.readdirSync(storeNM)) {
      if (pkg.startsWith('.')) continue;
      const topLevel = path.join(nodeModules, pkg);
      if (!fs.existsSync(topLevel)) {
        const pkgSrc = path.join(storeNM, pkg);
        try {
          if (fs.statSync(pkgSrc).isDirectory()) {
            fs.cpSync(pkgSrc, topLevel, { recursive: true });
            hoisted++;
          }
        } catch {}
      }
    }
  }
  if (hoisted > 0) console.log('Hoisted ' + hoisted + ' nested pnpm packages to top-level');
  fs.rmSync(pnpmDir, { recursive: true, force: true });
  console.log('Removed .pnpm directory');
}
if (skipped > 0) console.log('Skipped ' + skipped + ' broken symlinks');
" "$STANDALONE_DIR" "$TAURI_STANDALONE_DIR"

# Repair broken pnpm symlinks
repair_pnpm_symlinks() {
  local link_dir="$TAURI_STANDALONE_DIR/node_modules/.pnpm/node_modules"

  if [ ! -d "$link_dir" ] || [ ! -d "$PROJECT_PNPM_DIR" ]; then
    return
  fi

  if ! command -v readlink >/dev/null 2>&1; then
    echo "==> Skipping pnpm symlink repair (readlink not available)"
    return
  fi

  while IFS= read -r -d '' link_path; do
    if [ -e "$link_path" ]; then
      continue
    fi

    local link_target package_store_dir source_dir dest_dir
    link_target="$(readlink "$link_path" 2>/dev/null || true)"

    if [ -z "$link_target" ]; then
      continue
    fi

    package_store_dir="$(printf '%s' "$link_target" | cut -d/ -f2)"

    if [ -z "$package_store_dir" ]; then
      echo "WARN: Unable to resolve broken pnpm link: $link_path -> $link_target"
      continue
    fi

    source_dir="$PROJECT_PNPM_DIR/$package_store_dir"
    dest_dir="$TAURI_STANDALONE_DIR/node_modules/.pnpm/$package_store_dir"

    if [ ! -d "$source_dir" ]; then
      echo "WARN: Missing pnpm package for broken link: $link_path -> $link_target"
      continue
    fi

    echo "==> Repairing pnpm package link: $(basename "$link_path")"
    mkdir -p "$dest_dir"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a "$source_dir/" "$dest_dir/"
    else
      cp -r "$source_dir/." "$dest_dir/" 2>/dev/null || true
    fi
  done < <(find "$link_dir" -mindepth 1 -maxdepth 1 -type l -print0 2>/dev/null)
}

repair_pnpm_symlinks

# Remove broken symlinks that would cause bundler errors (NSIS, AppImage, etc.)
# Use Node.js for cross-platform reliability (find -type l misses Windows junction artifacts)
echo "==> Removing broken symlinks from resources..."
node -e "
const fs = require('fs'), path = require('path');
function clean(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    try {
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) {
        try { fs.statSync(p); } catch { fs.unlinkSync(p); continue; }
      }
      if (st.isDirectory()) clean(p);
    } catch {}
  }
}
clean(process.argv[1]);
" "$TAURI_STANDALONE_DIR"

echo "==> Syncing static assets..."
if command -v rsync >/dev/null 2>&1; then
  mkdir -p "$TAURI_STANDALONE_DIR/.next/static"
  if [ -d "$PROJECT_DIR/.next/static" ]; then
    rsync -a --delete "$PROJECT_DIR/.next/static/" "$TAURI_STANDALONE_DIR/.next/static/"
  else
    rm -rf "$TAURI_STANDALONE_DIR/.next/static"
  fi

  mkdir -p "$TAURI_STANDALONE_DIR/public"
  if [ -d "$PROJECT_DIR/public" ]; then
    rsync -a --delete "$PROJECT_DIR/public/" "$TAURI_STANDALONE_DIR/public/"
  else
    rm -rf "$TAURI_STANDALONE_DIR/public"
  fi
else
  rm -rf "$TAURI_STANDALONE_DIR/.next/static"
  if [ -d "$PROJECT_DIR/.next/static" ]; then
    mkdir -p "$TAURI_STANDALONE_DIR/.next"
    cp -r "$PROJECT_DIR/.next/static" "$TAURI_STANDALONE_DIR/.next/"
  fi

  rm -rf "$TAURI_STANDALONE_DIR/public"
  if [ -d "$PROJECT_DIR/public" ]; then
    cp -r "$PROJECT_DIR/public" "$TAURI_STANDALONE_DIR/"
  fi
fi

echo "==> Standalone build ready at: $STANDALONE_DIR"
echo "==> Tauri resources updated at: $TAURI_STANDALONE_DIR"
echo "==> Test with: PORT=3000 $NODE_EXE $TAURI_STANDALONE_DIR/server.js"
