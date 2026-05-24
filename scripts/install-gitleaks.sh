#!/usr/bin/env bash
# Argus — install gitleaks into .bin/ (repo-local, gitignored).
#
# Idempotent: if .bin/gitleaks is already present and matches the pinned
# version, this is a no-op. Safe to run from `prepare` on every pnpm install.
#
# To bump gitleaks, change GITLEAKS_VERSION and re-run.

set -euo pipefail

GITLEAKS_VERSION="8.30.1"
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$REPO_ROOT/.bin"
TARGET="$BIN_DIR/gitleaks"

# Skip if already at the right version.
if [ -x "$TARGET" ]; then
  current="$("$TARGET" version 2>/dev/null || true)"
  if [ "$current" = "$GITLEAKS_VERSION" ] || [ "$current" = "v$GITLEAKS_VERSION" ]; then
    exit 0
  fi
fi

# Allow CI to opt out — CI uses gitleaks-action instead of this binary.
if [ "${ARGUS_SKIP_GITLEAKS_INSTALL:-}" = "1" ]; then
  echo "ℹ️  install-gitleaks: ARGUS_SKIP_GITLEAKS_INSTALL=1 — skipping local install."
  exit 0
fi

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "$uname_s" in
  Darwin)  os="darwin" ;;
  Linux)   os="linux" ;;
  *)
    echo "⚠️  install-gitleaks: unsupported OS '$uname_s'. Install manually:"
    echo "    https://github.com/gitleaks/gitleaks/releases/tag/v${GITLEAKS_VERSION}"
    exit 0
    ;;
esac

case "$uname_m" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *)
    echo "⚠️  install-gitleaks: unsupported arch '$uname_m'. Install manually."
    exit 0
    ;;
esac

asset="gitleaks_${GITLEAKS_VERSION}_${os}_${arch}.tar.gz"
url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset}"

mkdir -p "$BIN_DIR"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "📦 install-gitleaks: downloading $asset"
if ! curl -fsSL "$url" -o "$tmpdir/gitleaks.tar.gz"; then
  echo "⚠️  install-gitleaks: download failed. Pre-commit secret scanning will be unavailable."
  echo "    URL: $url"
  echo "    Workaround: install via brew/apt or run the script again with network access."
  exit 0
fi

tar -xzf "$tmpdir/gitleaks.tar.gz" -C "$tmpdir" gitleaks
mv "$tmpdir/gitleaks" "$TARGET"
chmod +x "$TARGET"

echo "✅ install-gitleaks: installed $($TARGET version) at $TARGET"
