#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_BUNDLE="$PROJECT_DIR/src-tauri/target/debug/bundle/macos/EchoType.app"
APP_EXECUTABLE="$APP_BUNDLE/Contents/MacOS/echotype"
DEFAULT_KEY_PATH="$HOME/.tauri/echotype.key"

BUILD_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --build-only)
      BUILD_ONLY=1
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: bash scripts/build-tauri-local.sh [--build-only]"
      exit 1
      ;;
  esac
done

load_signing_key() {
  if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
    return
  fi

  local key_path="${TAURI_SIGNING_PRIVATE_KEY_PATH:-$DEFAULT_KEY_PATH}"
  if [ ! -f "$key_path" ]; then
    echo "ERROR: Tauri signing key not found."
    echo "Set TAURI_SIGNING_PRIVATE_KEY or place the private key at: $key_path"
    exit 1
  fi

  export TAURI_SIGNING_PRIVATE_KEY
  TAURI_SIGNING_PRIVATE_KEY="$(cat "$key_path")"
}

load_signing_password() {
  if [ -n "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" ]; then
    return
  fi

  if [ ! -t 0 ]; then
    echo "ERROR: TAURI_SIGNING_PRIVATE_KEY_PASSWORD is not set."
    echo "Export it before running this script in a non-interactive environment."
    exit 1
  fi

  printf "TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "
  stty -echo
  IFS= read -r TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  stty echo
  printf "\n"
  export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
}

verify_local_bundle() {
  if [ ! -d "$APP_BUNDLE" ]; then
    echo "ERROR: Built app bundle not found at $APP_BUNDLE"
    exit 1
  fi

  pkill -f "$APP_EXECUTABLE" >/dev/null 2>&1 || true
  open -n "$APP_BUNDLE"
  sleep 5

  if pgrep -fl "$APP_EXECUTABLE" >/dev/null 2>&1; then
    echo "==> EchoType debug bundle launched successfully"
    return
  fi

  echo "ERROR: EchoType bundle was built but did not stay running."
  exit 1
}

load_signing_key
load_signing_password

echo "==> Building signed local Tauri debug bundle..."
cd "$PROJECT_DIR"
pnpm tauri build --debug

echo "==> Built local bundle:"
echo "    $APP_BUNDLE"

if [ "$BUILD_ONLY" -eq 1 ]; then
  exit 0
fi

verify_local_bundle
