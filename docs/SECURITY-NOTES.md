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

### 6. Audit Gate Scope (2026-07-25)

The CI `audit` job runs **two** gates, because shipped code and build tooling are not the same risk:

| Tree                             | Packages | Blocks a merge on |
| -------------------------------- | -------- | ----------------- |
| Shipped (`--prod`)               | ~30      | high + critical   |
| Full tree (dev tooling included) | ~570     | critical only     |

```bash
pnpm audit --prod --audit-level=high   # what reaches a user
pnpm audit --audit-level=critical      # what can take over CI
```

**Why.** Between 2026-07-22 and 2026-07-24 the npm ecosystem published **4,000+ advisories** against a prior baseline of roughly 55–70 per week. Four of them blocked unrelated PRs here in a single week (postcss, brace-expansion ×2, js-yaml). Every one was rated **high** and every one was CWE-400 resource exhaustion. Three of the four were **dev-only transitives**, unreachable from shipped code.

> **Correction (2026-08-09, SEC-03).** The fourth, **js-yaml, is not dev-only** — it reaches the shipped tree through `@argus/config → cosmiconfig`, and `pnpm why js-yaml --prod` has always said so. This paragraph asserted the opposite, and the `pnpm-workspace.yaml` comment block was headed "dev-only transitives" on the same mistaken basis. The gate itself was never fooled: it correctly classified js-yaml as `--prod` and blocked on it, which is how the error surfaced. **What failed was the hand-written note beside the gate, and it stayed wrong for five weeks because nobody re-ran `--prod` after the config loader was built.** Treat the classification in any of these notes as a claim with an expiry date; the command is the authority.

The old single gate (`--audit-level=high` over the full tree) makes a solo maintainer hand-write a `pnpm-workspace.yaml` override every few days for denial-of-service bugs in test tooling. A gate that fires constantly on things nobody can act on decays into a gate people route around with `SKIP=` — which is a worse security outcome than a narrower gate that is always meaningful.

**Why `critical` is a real floor, not a token.** A pure DoS is arithmetically incapable of reaching critical: with `C:N/I:N` in the CVSS vector, the score ceiling is **7.5** even when the bug is remote, unauthenticated, and trivial to trigger (`AV:N/AC:L/PR:N/UI:N`) — that is the exact vector of the brace-expansion advisory that blocked us. Critical requires `C:H`/`I:H`: reading secrets, forging data, executing code. So this gate ignores the DoS churn by construction while still stopping anything that could take over a CI runner — which holds `TURBO_TOKEN`, `GITHUB_TOKEN`, and eventually publish credentials.

**Residual risk, accepted deliberately.** This is a **loosening**, not a free win:

- A high-severity dev-tool bug that is _not_ a DoS — an information disclosure or a path traversal held under 9.0 by some prerequisite — no longer blocks a merge. Dependabot still raises it; a human decides.
- The prod/dev boundary is cosmetic today (everything is `private: true`, nothing publishes) and becomes **load-bearing at first publish**. A dependency misclassified as dev, or one pulled into a published bundle, would sit outside the blocking gate. Guarded by a pre-publish item in the [go-public runbook](./go-public-runbook.md).
  - **This risk half-materialised on 2026-08-09 (SEC-03), in the safe direction.** js-yaml was misclassified as dev in _prose_ while pnpm always resolved it as `--prod`, so the gate blocked correctly and only the documentation was wrong. Had the misclassification been in `package.json` instead of a comment, the same advisory would have sat outside the blocking gate silently. The lesson stands whichever direction it falls: **`pnpm why <pkg> --prod` is the classification, and it must be re-run after any change to a package's dependencies — not inherited from a note.**

**What this does _not_ weaken.** `pnpm audit` only ever knew about disclosed CVEs in legitimate packages. Defence against a genuinely _malicious_ package is `minimumReleaseAge`, `allowBuilds: false`, and the committed lockfile (§5) — untouched by this change.

**Detection is separate from blocking.** Dependabot alerts are enabled and fire when an advisory publishes, tagged `runtime` vs `development`; the weekly CI cron re-resolves pinned versions. This gate decides only what stops a merge. Note that Dependabot cannot _fix_ deep transitives (it bumps direct dependencies; it cannot author a pnpm `overrides` entry), so those pins stay manual.

**Negative-tested when introduced** (2026-07-25) — a gate that scanned nothing would also be green, so both were proven to fire in throwaway projects:

| Planted advisory                       | `--prod --audit-level=high` | `--audit-level=critical` |
| -------------------------------------- | --------------------------- | ------------------------ |
| `lodash@4.17.15` as a **prod** dep     | **exit 1** (blocks)         | —                        |
| `lodash@4.17.15` as a **dev** dep      | exit 0 (by design)          | —                        |
| `minimist@1.2.5` (critical) as dev dep | exit 0 (by design)          | **exit 1** (blocks)      |

Re-run these if the flags or pnpm's exit semantics ever change.

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
