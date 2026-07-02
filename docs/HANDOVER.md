# Handover — P0-14 → P0-16

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-02
**Phase:** P0 — Foundation
**Last task completed:** P0-14 — pnpm 11 upgrade, minimum release age & install-script blocking

---

## Context

Supply-chain hardening is now **live**: pnpm 11.5.3 (exact-pinned), `minimumReleaseAge: 4320` (3 days), dependency install scripts blocked (`allowBuilds: {}`), all recorded in [ADR-0003](./adr/0003-supply-chain-hardening-baseline.md). The gate was verified on adoption day — resolving a 1-day-old `@types/node` fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. Server-side controls also went live this cycle: branch protection on `main` (PR required, 6 required checks, `enforce_admins` on), and the local agent allowlist no longer auto-permits `gh pr merge` — merging is human-only in practice, not just by rule.

**Next: P0-16 (lint-staged pre-commit)** — it was hard-blocked on P0-14 precisely because it adds a dependency; that addition must now pass the release-age gate. After P0-16, the licensing arc resumes at P0-11 (read [its archived handover](./handovers/p0-10-license-policy-handover.md) first — that work's context is preserved there; the work itself is done and merged).

---

## What I Did

- `packageManager` → `pnpm@11.5.3` (newest 11.x ≥3 weeks old); `engines` → node `>=22.13.0` / pnpm `>=11.0.0`; `.nvmrc` (22) added. Lockfile byte-identical (v9.0 format spans pnpm 9–11).
- `pnpm-workspace.yaml`: `minimumReleaseAge: 4320`, empty `minimumReleaseAgeExclude`, explicit `allowBuilds: {}` — override procedures documented in [SECURITY-NOTES §5](./SECURITY-NOTES.md).
- ADR-0003 (accepted); full suite green under Node 22 + pnpm 11 (lint / format / typecheck / 9 tests at 100% cov / build); root `prepare` (husky + gitleaks) confirmed still running.
- Earlier this cycle: stacked-merge incident fixed via PR #10 (see Gotchas #4), P0-15 merged (#9), remote branch cleanup.

---

## What I Did NOT Do (Deferred)

- **P0-16, P0-11, P0-07, P0-12, P0-13** — unstarted, in Up Next order.
- **`nvm alias default` still points at Node 20 on the dev machine.** Node 22.23.1 is installed; the maintainer decides whether to flip the default (`nvm alias default 22`). Until then, shells need `nvm use` (reads `.nvmrc`).
- **Maintainer decisions still open:** D-1 (remote cache), copyright/identity before going public.
- **Tracker PR links:** P0-14's row says _pending_ — fill in its PR number on the next tracker touch.

---

## Gotchas & Surprises

1. **Node 20 is dead weight:** pnpm 11.5.3 requires node ≥22.13, and Node 20 hit EOL 2026-04-30. Any shell on node 20 fails fast with an engine error — run `nvm use` in the repo root.
2. **First install after a pnpm major bump** prompts to purge `node_modules`; in a non-TTY shell pass `--config.confirmModulesPurge=false` (one-time; CI unaffected).
3. **Root-level `pnpm add` needs `-w`** (workspace-root guard) — the error message says so.
4. **Stacked-PR merge trap (the big one this cycle):** merging a stacked PR whose base branch still exists sends the content into the _base branch_, not `main` — that's how #7/#8/#9 mis-landed and needed #10 to fix. "Automatically delete head branches" is now enabled, which makes GitHub retarget the next PR automatically. Prefer non-stacked PRs from `main` regardless (protocol rule since P0-15).
5. **When adding any dependency now:** pick a version ≥3 days old (`pnpm view <pkg> time --json`), exact-pin it, and verify the package name/repo before installing — CLAUDE.md and SECURITY-NOTES §5 have the checklist.

---

## State of the System

- ✅ Tests: 9 passing, 100% line/branch on `@argus/testing`; lint/format/typecheck/build green under Node 22 + pnpm 11.5.3
- ✅ `main` complete through PR #10; branch protection live (6 required checks, enforce_admins)
- ⏸ This task's PR: open, pending human merge (required checks must pass first)
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-16 — Hook ergonomics: lint-staged pre-commit** (dep P0-14 ✅ once this PR merges; branch from `main` after it lands):

1. Read §[P0-16] in [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md).
2. `pnpm view lint-staged time --json` → newest version ≥3 days old; verify name + repository; `pnpm add -Dw lint-staged@<exact>` (the gate enforces the age anyway — that's the point).
3. Rewrite `.husky/pre-commit`: staged-scope ESLint + `prettier --write` via lint-staged; **keep the gitleaks staged scan and `SKIP=` semantics exactly as they are**.
4. Test matrix from the spec: drifted file auto-formats and commits; `SKIP=lint`/`format`/`gitleaks` still work individually; a fake AWS key in a non-fixture file is still blocked; CI lint job untouched.
5. Tracker + handover rotation (~100-line budget), PR with review packet.

Estimated effort: **XS**.

---

## Open Questions for the Next Agent

- lint-staged config placement: `package.json` `"lint-staged"` key vs `.lintstagedrc` — either works; prefer `package.json` to avoid another root dotfile.

---

## Files Touched This Session

```
package.json                                           [modified — pnpm 11.5.3, engines]
pnpm-workspace.yaml                                    [modified — release-age gate, allowBuilds]
.nvmrc                                                 [created]
docs/adr/0003-supply-chain-hardening-baseline.md       [created]
docs/SECURITY-NOTES.md                                 [modified — §5 Supply-Chain Controls]
docs/IMPLEMENTATION.md                                 [modified — 8/16, PR links backfilled]
docs/HANDOVER.md                                       [rewritten — this file]
docs/handovers/p0-15-workflow-codification-handover.md [created — archive]
.work/P0-14.md                                         [created — gitignored]
```

---

## Sign-off

Toolchain upgrade verified end-to-end (suite green, gate demonstrably refusing fresh versions, prepare intact); P0-16 can start from `main` as soon as this PR merges.

— claude-fable-5
