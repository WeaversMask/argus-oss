# Handover — P0-03 → P0-04

**From:** claude-opus-4-7
**To:** next picker
**Date:** 2026-05-24
**Phase:** P0 — Foundation
**Last task completed:** P0-03 — ESLint + Prettier + commitlint + gitleaks

---

## Context

The repository now has a full code-quality gate: ESLint 10 (flat config, `@typescript-eslint`, explicit-any banned), Prettier 3.8, commitlint 21 (conventional, restricted to the six commit types from `00-principles.md`), Husky 9 hooks (`pre-commit` and `commit-msg`), and gitleaks 8.30.1 installed into a repo-local `.bin/` (gitignored) via `scripts/install-gitleaks.sh`. The `prepare` script auto-installs both husky and gitleaks on every `pnpm install`. A `SKIP=<gate>` env var (comma-separated; documented in `docs/SECURITY-NOTES.md`) provides per-hook escape hatches. The matching `.github/workflows/ci.yml` runs lint, format-check, commit-message validation (PR-only), and `gitleaks/gitleaks-action@v2` on every PR and push-to-main.

Next up is **P0-04 — Vitest test infrastructure**. It depends only on P0-02 (TypeScript). The goal is a shared Vitest config in `packages/testing` with coverage thresholds (85% line, 80% branch), a way to run `pnpm test` across all packages, and aggregated monorepo-wide coverage reporting. This is the first task that creates a real, persistent workspace package (no more smoke-and-delete). Phase 0 still forbids placeholder source code in app/library packages, but `packages/testing` is the testing-infrastructure exception called out in the repo-structure doc.

---

## What I Did

- ESLint 10.4.0 flat config in `eslint.config.mjs` — `@typescript-eslint/no-explicit-any: error`, `consistent-type-imports: error` (auto-fixes for `verbatimModuleSyntax`), plus the usual no-floating-promises / no-misused-promises / await-thenable / no-non-null-assertion / no-console set. Separate rule blocks for tests (relaxes some) and `.cjs` config files (CJS globals).
- Prettier 3.8.3 with `.prettierrc.json` (semi, double-quote, trailing-comma=all, printWidth=100) and `.prettierignore`. One-shot `pnpm format` reformatted 25 existing docs to the new baseline; this is the bulk of the diff and is content-neutral (table alignment + blank lines around block elements).
- commitlint 21.0.1 with `commitlint.config.cjs` extending `@commitlint/config-conventional`, restricted to `feat | fix | chore | refactor | docs | test` per principles.
- Husky 9.1.7 with `.husky/pre-commit` (lint → format:check → gitleaks) and `.husky/commit-msg` (commitlint). Each step gated by `SKIP` env var.
- `scripts/install-gitleaks.sh` — POSIX bash, detects OS/arch, downloads pinned gitleaks v8.30.1 into `.bin/gitleaks`, idempotent, fails-soft on network errors (clearly logged). `ARGUS_SKIP_GITLEAKS_INSTALL=1` opt-out for CI.
- `.gitleaks.toml` extending the default rule set with allowlists for `tests/fixtures/secret-detection/`, `pnpm-lock.yaml`, and the `AKIA-FAKE-TEST-FIXTURE-*` pattern used by the `fakeSecret()` helper that P0-04 will land.
- `.github/workflows/ci.yml` with four jobs: `lint` (eslint + prettier --check), `commitlint` (PR-only, validates the commit range), `secret-scan` (full-history gitleaks-action). `lint` job uses `node-version-file: package.json` so the Node version stays in one place.
- `docs/SECURITY-NOTES.md` updated with the install path, the SKIP override family, and an explicit warning against `--no-verify`.
- Root `package.json`: scripts now include `lint`, `lint:fix`, `format`, `format:check`, `prepare`.
- `.gitignore` gained `.bin/`.
- Smoke tests for all 5 gates passed end-to-end (see `.work/P0-03.md` for the matrix); scratch artefacts removed before commit.

PRs merged in this session:

- _pending_ — branch `p0-03-lint-format-secrets` pushed, PR not yet opened (gh auth still broken)

---

## What I Did NOT Do (Deferred)

- **No `lint-staged`.** Considered. Decision: not needed yet. Full-repo lint and format-check are <1 s on this size of monorepo. Once packages grow and hook latency becomes noticeable, add `lint-staged` and swap the pre-commit body for `pnpm exec lint-staged`. Don't add prematurely — another dep, another config.
- **No `tests/fixtures/secret-detection/README.md`.** `SECURITY-NOTES.md` already references this directory, but it doesn't exist yet (nothing lives in it). When P0-04 creates the `packages/testing` package and the `fakeSecret()` helper, add `tests/fixtures/secret-detection/README.md` explaining the synthetic-fixture convention. The gitleaks allowlist already covers the path so creating the directory won't break anything.
- **No remote Turbo cache.** Phase notes mention this. Defer to P0-05 (CI pipeline) so the decision (Vercel hosted vs self-hosted) is made once with full context.
- **No commitlint scope-enum restriction.** Could enumerate allowed scopes (`p0-03`, `core`, `cli`, etc.) but the phase task list isn't stable enough yet. Add after Phase 1 lands its first real package boundaries.
- **No GitHub PR/issue templates.** That's part of P0-07.
- **No branch-protection rules enabled.** Cannot be done from code — requires repo admin to flip on "Require status checks: lint, secret-scan" in the GitHub UI. Note in your PR description so a maintainer does this when merging.
- **gh CLI auth still broken.** Same as the last two handovers. Branch pushed, PR creation needs manual click on the GitHub URL.

---

## Gotchas & Surprises

1. **`typescript-eslint@8.20.0` (the version I first installed) pinned TS at <5.8.** We're on 6.0.3. Bumped to `8.59.4` whose peer range is `<6.1.0`. If you bump TS again, check `pnpm view typescript-eslint peerDependencies` first.
2. **`eslint.config.js` triggers `MODULE_TYPELESS_PACKAGE_JSON` on every run.** Renamed to `eslint.config.mjs`. Keep this name; do not "fix" it by adding `"type": "module"` at root because that would force every CommonJS config file (commitlint, future ones) to `.cjs` extension.
3. **`.cjs` files need a flat-config block declaring CJS globals.** Otherwise `no-undef` flags `module`, `require`, `exports`. The block lives at the bottom of `eslint.config.mjs`; mirror it if you add more `.cjs` config files.
4. **gitleaks has its OWN allowlist for canonical AWS docs example keys.** `AKIAIOSFODNN7EXAMPLE` will NOT trigger a leak — gitleaks ships it as a known false-positive. When writing tests that need to verify gitleaks fires, use a randomly-generated AKIA-shaped string instead.
5. **`pnpm format` reformatted every existing doc.** It's noise but it's a one-time cost — future `format:check` runs will stay clean. The diff is in this PR for transparency rather than hidden in a "chore: prettier" commit.
6. **gitleaks v8 `protect --staged` subcommand still works** but the v9 release (whenever it ships) is expected to migrate to `git --staged` or similar. If you upgrade gitleaks past 8.x, expect the pre-commit hook command to need updating.
7. **`prepare` runs on `pnpm install` _in every package install context_**, including in CI. CI sets `HUSKY=0` and `ARGUS_SKIP_GITLEAKS_INSTALL=1` to skip both — preserve this in any new CI job.
8. **Prettier formats Markdown tables aggressively.** Column widths get padded to the longest cell. If the IMPLEMENTATION.md "Recently Completed" table gets a wide entry, the whole column expands. Cosmetic but the diff can look outsized.

---

## State of the System

- ✅ `pnpm install` clean (177 packages now; +commitlint/eslint/prettier/husky family)
- ✅ `pnpm lint` exits 0 on clean tree
- ✅ `pnpm format:check` exits 0 on clean tree
- ✅ `pnpm typecheck` exits 0 (zero workspaces — turbo no-op)
- ✅ `.husky/pre-commit` end-to-end exit 0 on clean tree
- ✅ gitleaks blocks AWS-shaped strings outside the fixture allowlist (verified)
- ✅ `SKIP=gitleaks`, `SKIP=lint`, `SKIP=format`, `SKIP=commitlint` all work (verified)
- ⏸ Tests: still none (P0-04)
- ⏸ Branch protection: not enabled (requires admin)
- ⏸ Dogfooding scan: not possible until Phase 2

---

## Recommended Next Steps

Pick up **P0-04 — Vitest test infrastructure** in this order:

1. Re-read [`docs/plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) — P0-04 section
2. Add `packages/testing/` as the first **persistent** workspace package. It's the testing infrastructure home — `packages/testing` per [`docs/plan/01-repo-structure.md`](./plan/01-repo-structure.md). Give it `package.json` (name `@argus/testing`, `type: "module"`, `exports` map), `tsconfig.json` extending the base, and a `src/` with at least `index.ts`
3. Install `vitest` + `@vitest/coverage-v8`. Vitest is on 3.x as of mid-2026 — verify `pnpm view vitest dist-tags`
4. Create `packages/testing/src/vitest.config.ts` exporting a shared config factory. Pattern: `defineConfig({ coverage: { thresholds: { lines: 85, branches: 80 } } })`. Each downstream package imports and extends
5. Wire a `test` script in `packages/testing/package.json` that runs `vitest run`
6. Verify `pnpm test` from root runs through turbo and picks up the package
7. Add at least one trivial test (e.g. `expect(true).toBe(true)`) so coverage and pass/fail wiring is exercised end-to-end
8. Acceptance: "Custom matchers can be imported from `@argus/testing`" — add a placeholder custom matcher (e.g. `expect.extend({ toBeNonEmpty })`) and re-export from `@argus/testing`. Verify another package's test can import and use it
9. Decide: monorepo-wide coverage aggregation. Vitest has `--coverage.reporter` but cross-package aggregation needs either a single root vitest invocation that walks all packages, or per-package coverage + a merge step (e.g. `nyc merge`). Recommend the single-root approach with `vitest.workspace.ts` listing each package — simpler, no merge step needed
10. Update IMPLEMENTATION.md & rewrite HANDOVER.md
11. Open PR — be aware that this is the first PR that will EXERCISE the new CI workflow end-to-end. Expect a small CI iteration loop if any YAML or script bug surfaces

Estimated effort: **M** (the phase doc says M and it really is M — Vitest workspace config has sharp edges)

---

## Open Questions for the Next Agent

- **Vitest workspace vs per-package configs.** `vitest.workspace.ts` is the modern way to run all packages from a single invocation. Recommend it; it gives one coverage report without merging.
- **Should `@argus/testing` be its own pnpm workspace package, or live under `packages/testing/` as a directory?** The repo-structure doc lists it as a workspace package. Yes, a workspace package — referenced from other packages via `"@argus/testing": "workspace:*"` in devDeps.
- **Coverage on what?** Per package, exclude `tests/`, `src/**/*.test.ts`, `src/types/`, `src/**/index.ts` (barrel files). The principles say "≥85% line, ≥80% branch on NEW code" — `vitest` doesn't natively diff-based coverage; CI can use `vitest --coverage` and then a coverage-diff action. Defer the diff-coverage tooling to P0-05 (CI).
- **Custom matcher boilerplate.** The first matcher is the hardest because of typing. Use Vitest's `expect.extend` and augment `interface Assertion<T>`. Pin the pattern early so all future matchers follow it.
- **Snapshot tests.** Decide if `__snapshots__/` is allowed. Recommend no — snapshots rot, prefer explicit assertions. Add an ESLint rule if you want to enforce.

---

## Files Touched This Session

```
.work/P0-03.md                                       [created — gitignored]
.bin/gitleaks                                        [created — gitignored, downloaded via install script]
.gitignore                                           [modified — +.bin/]
.gitleaks.toml                                       [created]
.husky/pre-commit                                    [created/overwritten husky init template]
.husky/commit-msg                                    [created]
.prettierrc.json                                     [created]
.prettierignore                                      [created]
eslint.config.mjs                                    [created — renamed from .js to silence MODULE_TYPELESS warning]
commitlint.config.cjs                                [created]
scripts/install-gitleaks.sh                          [created]
.github/workflows/ci.yml                             [created — lint, commitlint (PR), secret-scan jobs]
package.json                                         [modified — +eslint/prettier/commitlint/husky/typescript-eslint, prepare script, new scripts]
pnpm-lock.yaml                                       [modified]
docs/SECURITY-NOTES.md                               [modified — gitleaks install + SKIP family]
docs/IMPLEMENTATION.md                               [modified — P0-03 → Recently Completed]
docs/HANDOVER.md                                     [modified — this file]
docs/handovers/p0-02-typescript-base-handover.md     [created — archive of previous handover]
docs/{25 existing markdown files}                    [modified — one-shot prettier baseline; content-neutral]
```

---

## Sign-off

Every commit from this point forward is gated by lint, format, conventional-commit validation, and secret scanning — both locally and in CI. P0-04 can land tests on a strong baseline.

— claude-opus-4-7
