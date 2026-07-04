# Handover — P0-12 → P0-13

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-04
**Phase:** P0 — Foundation
**Last task completed:** P0-12 — License-compliance guardrail (SPDX allowlist) in CI + local script

---

## Context

The licensing arc (P0-10 policy → P0-11 notices/docs → P0-12 enforcement) is **closed** pending the merge of [#17](https://github.com/WeaversMask/argus/pull/17). **Next: P0-13 — CI supply-chain hardening (config-only)** — it edits `ci.yml` like P0-12 did, so branch from `main` only **after #17 merges** (last leg of the P0-07 → P0-12 → P0-13 serialization). Spec in [phase-00 §P0-13](./plan/phases/phase-00-foundation.md); it needs no new dependencies, so the ADR-0003 dance doesn't apply.

**One decision rides on the #17 merge:** license-checker's own transitives include two SPDX-legal-team data packages under attribution licenses — `spdx-exceptions@2.5.0` (CC-BY-3.0) and `spdx-ranges@2.1.1` ((MIT AND CC-BY-3.0)). They are named, license-string-pinned exceptions in `scripts/check-licenses.mjs` (same mechanism as `lightningcss*`); the PR flags them prominently — **merging #17 is the maintainer sign-off**. If the maintainer objects instead, that reopens the locked "license-checker powers the gate" decision → escalate, don't improvise.

---

## What I Did

- **`scripts/check-licenses.mjs`** (+ `pnpm license-check`): the ADR-0002 §G gate. Key discovery: license-checker's `read-installed` cannot follow pnpm's symlinked virtual store past direct deps — from the repo root it saw **16 of 333** packages. The script therefore enumerates every **physical** package dir in `node_modules/.pnpm` and runs license-checker per dir, unioning per-package records (license _determinations_ stay license-checker's; verified 333 pkgs, ~2s, zero errors). Policy is fail-closed: UNKNOWN/UNLICENSED/custom text/`WITH` clauses fail; minimal OR/AND expression evaluator (OR = any side allowed, AND = all); guessed licenses (`*` suffix) are evaluated on the underlying id and reported as notes.
- **`license` CI job** beside `audit` in `ci.yml`, same triggers (PR / push-main / Monday cron), parallel, **not** a required check (admin step pending since P0-03 — documented in PR).
- **license-checker 25.0.1** exact-pinned (verified: davglass, 1.01M dl/wk vs fork's 339k, published 2019 → age gate moot, itself BSD-3-Clause). +56 packages, no build scripts (`allowBuilds: {}` untouched). `THIRD-PARTY-NOTICES` regenerated: 291 pkgs / 11 licenses, CC-BY sections now preserve the SPDX-data attributions.
- **Negative tests** (scratch pnpm fixtures, repo untouched, documented in PR): GPL-3.0-only → exit 1; **new** MPL-2.0 package → exit 1 (`lightningcss*` exception doesn't leak); `(MIT OR GPL-3.0-only)` → passes (OR semantics). Current tree passes with exactly the three named exceptions reported.

## What I Did NOT Do (Deferred)

- **P0-13, P0-06, P0-08, P0-09** — unstarted, in Up Next order.
- **Notices freshness check** (recommended fold-in since P0-11): deferred again — the platform-variance gotcha ([archived P0-11 handover](./handovers/p0-11-third-party-notices-handover.md) §Gotcha 3) makes a naive regenerate-and-diff false-positive on Linux CI. Recipe if picked up: compare `name@version` sets (lockfile vs `THIRD-PARTY-NOTICES`), normalizing away platform-suffix packages (`*-darwin-*`, `*-linux-*`, `*-win32-*`); don't diff file bytes.
- **No tests for `scripts/check-licenses.mjs`** — consistent with the P0-11 generator precedent (scripts/ sit outside vitest coverage; the documented negative tests are the verification). If scripts grow more logic, revisit.
- **Maintainer decisions still open:** D-1 (remote cache — P0-13's `remoteCache.signature` step touches this, see spec); `LICENSE` copyright placeholder; `nvm alias default 22`.

---

## Gotchas & Surprises

1. **license-checker + pnpm = depth-1 only.** Root-level run sees just direct devDeps (16/333). Anything license-related must go through the `.pnpm` physical-dir union (see script header). Canary: if `pnpm license-check` ever reports way under ~300 packages, traversal broke — treat as failure, not success.
2. **Exceptions are license-string-pinned by design.** A version bump that changes a package's license string re-trips the gate (e.g. `spdx-ranges` flipping to plain CC-BY-3.0 would fail until re-reviewed). Expected noise, not a bug.
3. **Platform variance is handled by name-regex, verify once:** on Linux CI the tree resolves `lightningcss-linux-*` instead of `-darwin-arm64` — the `^lightningcss(-.+)?$` exception covers all variants, but the **first CI run of the `license` job on #17 is the empirical proof — check it before merging**.
4. **Scratch installs outside the repo pick corepack's default pnpm 9**, not the repo's pinned 11 (no `packageManager` there). Same virtual-store layout, so fixtures still exercise the real code path; `--ignore-workspace` keeps pnpm from crawling up into the repo.
5. **Node 20 shell gotcha persists** for bare `pnpm` in fresh shells: `source ~/.nvm/nvm.sh && nvm use --silent` first (hooks are covered by `~/.config/husky/init.sh` since OPS-01).

---

## State of the System

- ✅ Tests 9 passing, 100% line/branch; lint/format green; `pnpm license-check` OK (333 pkgs, 3 exceptions); `pnpm audit` clean
- ⏸ PR #17: open, pending human merge (= CC-BY exception sign-off); watch the first `license`-job run per Gotcha 3
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-13 — CI supply-chain hardening** (branch after #17 merges; config-only, effort S):

1. Read [phase-00 §P0-13](./plan/phases/phase-00-foundation.md). Outputs: every `uses:` SHA-pinned (+version comment), `.github/dependabot.yml` (github-actions + npm, grouped minor/patch, cooldown ≈3 days), concrete Node version in CI (today `node-version-file: package.json` resolves a floating `>=` range — pin it), SHA256 verification in `scripts/install-gitleaks.sh`, `remoteCache.signature: true` in `turbo.json`.
2. Resolve SHAs from the upstream repos yourself (don't trust marketplace listings); the tampered-checksum negative test for install-gitleaks.sh must be documented in the PR.
3. Acceptance: no mutable action tags anywhere, CI green, dependabot config validates.
4. Tracker + handover rotation, review packet, PR.

## Open Questions for the Next Agent

- None new. The CC-BY named-exception sign-off resolves via the #17 merge (or its rejection — then escalate per Context above).

---

## Files Touched This Session

```
package.json                         [modified — license-checker devDep + license-check script]
pnpm-lock.yaml                       [modified — +56 packages]
scripts/check-licenses.mjs           [created — the gate]
THIRD-PARTY-NOTICES                  [regenerated — 291 pkgs, 11 licenses]
.github/workflows/ci.yml             [modified — license job]
docs/IMPLEMENTATION.md               [modified — 12/16, P0-12 row]
docs/HANDOVER.md                     [rewritten — this file]
docs/handovers/p0-07-dependency-audit-handover.md [created — archive]
.work/P0-12.md                       [created — gitignored]
```

## Sign-off

Licensing arc enforcement is live and empirically verified end-to-end (positive on the real tree, three negative fixtures); the only open thread is the CC-BY sign-off that the #17 merge itself resolves. P0-13 has a complete spec and a clean runway.

— claude-fable-5
