# Security & Sensitive Data — Working Rules

> **Read before your first commit.** Applies to all agents and humans working on this codebase.

## What Must NEVER Be Committed

### Credentials & Secrets

- API keys (npm, GitHub, GHCR, OSV cache, OAuth providers, anything)
- Database connection strings with embedded passwords
- Private keys (`.pem`, `.key`, `.p12`, `.pfx`, anything similar)
- Certificates with private material
- SSO certificates and OIDC client secrets
- JWT signing secrets
- Encryption keys of any kind
- Webhook secrets / signing tokens
- License keys for commercial tools

### Local Environment Data

- `.env`, `.env.local`, `.env.development`, any non-template env file
- Local database files (`*.db`, `*.sqlite`, etc.)
- Personal scan outputs (may contain proprietary code from your machine)
- IDE workspace files containing absolute paths (`.vscode/settings.json`, `.idea/workspace.xml`)
- Build outputs and source maps (source maps embed absolute source paths)

### Customer & Beta Partner Data

- Real code from beta partners used as test fixtures (use synthetic fixtures instead)
- Internal hostnames, IP addresses, or infrastructure topology
- Customer email addresses, names, or identifiers
- Real CVE reports tied to a specific customer
- Anonymised data that could be re-identified

### Personal Data of Contributors

- Author home directory paths in any file (no `/Users/joe/...` or `C:\Users\joe\...`)
- Personal email addresses outside of `git config` and authored commits
- Local machine identifiers

---

## Defences in Place

### 1. `.gitignore`

The root `.gitignore` is intentionally strict. If you need to commit a file that's currently ignored, prefer to rename the file pattern rather than `git add -f`.

### 2. Secret-Scanning Pre-Commit Hook (P0-03)

Phase 0 task P0-03 installs **gitleaks** as a pre-commit hook. It scans staged changes for:

- High-entropy strings (likely API keys)
- Known credential formats (AWS keys, GitHub tokens, Slack tokens, etc.)
- Private key file headers (`-----BEGIN ... PRIVATE KEY-----`)

If gitleaks flags something, the commit is **blocked**.

**Installation.** `pnpm install` runs `scripts/install-gitleaks.sh` via the `prepare` script. It downloads the pinned gitleaks binary into `.bin/gitleaks` (gitignored). The hook prefers this local binary, then falls back to `gitleaks` on `PATH` (e.g. `brew install gitleaks`). If neither exists, the hook fails clearly with installation instructions — it does NOT silently allow the commit.

To skip the local download (e.g. CI, which uses the official action instead):

```bash
ARGUS_SKIP_GITLEAKS_INSTALL=1 pnpm install
```

To bump gitleaks, change `GITLEAKS_VERSION` in `scripts/install-gitleaks.sh` and re-run `pnpm install`. CI's pinned version is the `gitleaks-action@v2` default — bump it in `.github/workflows/ci.yml` in the same PR to keep local and CI in sync.

**Skipping the scan.** Rare, requires written justification in the commit message:

```bash
SKIP=gitleaks git commit -m "fix(thing): legitimate-secret-shaped-string-explained"
```

The `SKIP` env var is comma-separated and applies to other hook steps too: `SKIP=lint`, `SKIP=format`, `SKIP=commitlint`, or combinations like `SKIP=gitleaks,lint`. Never use `--no-verify` to bypass all hooks at once — name the specific gate you're skipping and explain why.

**Pre-push layer (OPS-03).** `.husky/pre-push` runs `gitleaks detect` over the exact range each push would publish (`remote-sha..local-sha`; for a new branch, everything not already on a remote-tracking ref). It catches what pre-commit cannot: commits created with `SKIP=gitleaks` and history rewritten after the staged scan (rebase, amend). It also **fails closed on operational errors** (#14 review finding): gitleaks exits 0 when its underlying `git log` fails, so the hook verifies the remote SHA resolves locally (falling back to the conservative range when it doesn't) and blocks on any `ERR` line in the scan output — a scan that never ran must not pass. Nothing unscanned leaves the machine unless explicitly bypassed — `SKIP=gitleaks git push` works here too, with the justification going in the PR description instead of a commit message. Negative tests (a planted synthetic `ghp_` token blocked with exit 1; the fail-closed paths) are documented in the OPS-03 PR.

### 3. CI Secret Scanning

GitHub Actions runs `gitleaks` (via the official `gitleaks/gitleaks-action@v2`) against the full repo history on every PR and every push to `main`. This is the third layer, and the only one that cannot be `SKIP`'d — it catches anything the local pre-commit and pre-push hooks missed or were bypassed on. The same `.gitleaks.toml` config is honoured, so the fixture allowlist applies in all three places.

### 4. Build Output Path Sanitisation

- TypeScript: `compilerOptions.sourceRoot` is set so source maps reference paths relative to the package root, not `/Users/...` or `/home/...`
- Bundlers: configure `devtool: 'source-map'` (or equivalent) with project-relative paths
- Docker builds use `--no-cache` for the final layer to avoid leaking build args

### 5. Supply-Chain Controls (pnpm) — ADR-0003

Configured in `pnpm-workspace.yaml`, enforced by pnpm ≥11 (pinned via `packageManager`):

- **`minimumReleaseAge: 4320`** — `pnpm add`/`update` refuses any version published less than 3 days ago (`ERR_PNPM_NO_MATURE_MATCHING_VERSION`). This is the window in which malicious releases are typically detected and yanked. It does **not** affect `--frozen-lockfile` installs of already-locked versions.
- **`allowBuilds`** — no dependency may run install/build scripts unless listed `true`. The root project's own `prepare` (husky + gitleaks) still runs. Entries are a **review ledger**, both directions: `pkg: true` = reviewed, script may run; `pkg: false` = reviewed and **denied** — the script stays blocked and pnpm stops failing install (`ERR_PNPM_IGNORED_BUILDS`) over it. pnpm 11 scaffolds placeholder entries into `pnpm-workspace.yaml` when it hits an unreviewed build script — replace the placeholder with an explicit decision, never a reflexive `true`. (First `false` entries: the tree-sitter grammars, whose native-binding install scripts are dead weight next to the wasm we actually consume — ADR-0005.)

**Urgent security patch that can't wait 3 days:**

1. Confirm the advisory (CI `audit` job / Dependabot alert), then add the package to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`
2. `pnpm add <pkg>@<patched-version>` (verify the exact name and the publisher before installing)
3. **Remove the exclude entry again in the same PR** — the list stays empty at rest
4. Note the override and why in the PR description

**Adding a package that genuinely needs install scripts** (native builds etc.): review what the script does first, then add `pkg-name: true` under `allowBuilds` with a justification comment — never blanket-allow.

---

## If You Accidentally Commit a Secret

**Immediately, in this order:**

1. **Rotate the secret.** It's compromised the moment it's pushed, even if you delete the commit. Git history can be cached, mirrored, and indexed by bots within seconds.
2. **Remove from history** using `git filter-repo` (not just a new commit deleting the line — the secret is still in history).
3. **Force-push the cleaned history** if the branch hasn't been merged.
4. **Notify the team** — file an incident report under `docs/incidents/`.
5. **If the secret was in a merged branch**, additionally:
   - Revoke any access the secret granted
   - Audit logs for unauthorized use during the exposure window
   - Mention in the next phase handover

---

## Test Fixtures with Secret-Like Content

Some rules and adapters (notably the TruffleHog adapter) need fixtures that contain secret-shaped strings to verify detection works. These must:

1. Use the `@argus/testing` `fakeSecret()` helper, which produces deterministic obviously-fake values:
   ```typescript
   // Generates strings like: AKIA-FAKE-TEST-FIXTURE-NEVERREAL01
   const fixture = fakeSecret("aws-access-key");
   ```
2. Be located under `tests/fixtures/secret-detection/` (which is allowlisted in the gitleaks config)
3. Include a `README.md` in the fixture directory explaining the fakes are deterministic test data

Never paste real secrets — even expired or "test" secrets from a real provider — into fixtures. Use the helper.

---

## Environment Variables — Pattern

For every config that uses environment variables, commit a `.env.example` (or `.env.template`) showing the structure with placeholder values:

```bash
# .env.example
DATABASE_URL=postgres://user:password@host:5432/dbname
GITHUB_TOKEN=ghp_replace_me_with_a_real_token
JWT_SECRET=generate-a-random-32-byte-string
```

This file IS committed. The real `.env` (with actual values) is not.

The application validates required env vars at startup via Zod and refuses to start with helpful errors if anything is missing.

---

## Reporting a Vulnerability

If you find a security issue in Argus itself (not a secret committed by accident), follow the process in [`SECURITY.md`](../SECURITY.md) at the repo root rather than opening a public issue.
