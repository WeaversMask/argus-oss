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

# Expected SHA-256 per platform tarball, taken from the release's published
# checksums file (P0-13, ADR-0003):
#   https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_checksums.txt
# Bumping GITLEAKS_VERSION means refreshing all four values from the new
# release's checksums file. Every os/arch combination that reaches this point
# is one of these four — anything else exited above.
case "${os}_${arch}" in
  darwin_arm64) expected_sha256="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5" ;;
  darwin_x64) expected_sha256="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709" ;;
  linux_arm64) expected_sha256="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080" ;;
  linux_x64) expected_sha256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb" ;;
esac

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

# Verify before extracting. A failed download soft-skips above (availability
# tradeoff — pre-commit scanning degrades, nothing is installed), but a
# checksum MISMATCH is a hard failure: never extract or install a tarball
# that isn't byte-for-byte the audited release asset.
if command -v sha256sum >/dev/null 2>&1; then
  actual_sha256="$(sha256sum "$tmpdir/gitleaks.tar.gz" | awk '{print $1}')"
else
  actual_sha256="$(shasum -a 256 "$tmpdir/gitleaks.tar.gz" | awk '{print $1}')"
fi
if [ "$actual_sha256" != "$expected_sha256" ]; then
  echo "❌ install-gitleaks: SHA-256 mismatch for $asset" >&2
  echo "   expected: $expected_sha256" >&2
  echo "   actual:   $actual_sha256" >&2
  echo "   Refusing to install. Verify your network path, or fetch the release" >&2
  echo "   manually and compare against the published checksums file:" >&2
  echo "   https://github.com/gitleaks/gitleaks/releases/tag/v${GITLEAKS_VERSION}" >&2
  exit 1
fi

tar -xzf "$tmpdir/gitleaks.tar.gz" -C "$tmpdir" gitleaks
mv "$tmpdir/gitleaks" "$TARGET"
chmod +x "$TARGET"

echo "✅ install-gitleaks: installed $($TARGET version) at $TARGET"
