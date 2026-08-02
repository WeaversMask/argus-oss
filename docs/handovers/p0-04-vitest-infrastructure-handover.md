# Handover — P0-04 → P0-05

**From:** claude-opus-4-7
**To:** next picker
**Date:** 2026-05-25
**Phase:** P0 — Foundation
**Last task completed:** P0-04 — Vitest test infrastructure

---

## Context

The monorepo now has a working test runner. Vitest 4.1.7 + `@vitest/coverage-v8` are pinned at the root; the first persistent workspace package, `@argus/testing`, exposes `defineProjectConfig` (shared coverage thresholds: 85% line / 80% branch), a `fakeSecret()` fixture helper aligned with `.gitleaks.toml`, and a `toBeNonEmpty` custom matcher with full `declare module "vitest"` augmentation. A root `vitest.config.ts` runs every workspace project in a single invocation via Vitest's `test.projects` API (the v4 replacement for `vitest.workspace.ts`), so `pnpm test` produces one aggregated coverage report. `pnpm test:packages` (Turbo) still works as a per-package fallback.

Next up is **P0-05 — GitHub Actions CI pipeline**. The existing `.github/workflows/ci.yml` already has lint / format-check / commitlint / secret-scan jobs. P0-05 extends it with `typecheck`, `test`, and `build` jobs, wires Turbo remote cache (decision pending — Vercel Remote Cache vs self-hosted; see Open Questions), and asks a maintainer to flip branch-protection on the new required checks. This is the first task that exercises `pnpm test` in CI end-to-end — expect a small iteration loop if anything is platform-specific.

---

## What I Did

- Created `packages/testing/` — the first persistent workspace package. `package.json` declares `@argus/testing`, `type: "module"`, `sideEffects: false`, and an `exports` map with three subpaths (`.`, `./config`, `./setup`) that point at `src/*.ts` directly (no build step yet — `bundler` module resolution + workspace symlinks + `verbatimModuleSyntax` cooperate).
- `packages/testing/src/config.ts` exports `defineProjectConfig(overrides?)` — wraps Vitest's `defineConfig` with shared defaults (Node env, coverage provider v8, thresholds 85% line / 80% branch / 85% func / 85% stmt, sensible coverage excludes including `src/**/types.ts` for module-augmentation files).
- `packages/testing/src/matchers/to-be-non-empty.ts` + `matchers/types.ts` — the matcher uses `MatcherResult` (the `vitest` re-export alias for `@vitest/expect`'s `ExpectationResult`). The augmentation file uses `Matchers<T = any>` because `@vitest/expect`'s base interface has the same default — declaration merging requires it. There is exactly one `eslint-disable-next-line @typescript-eslint/no-explicit-any` in the file, with a comment block explaining why.
- `packages/testing/src/fixtures/fake-secret.ts` — three kinds (`aws-access-key`, `github-token`, `generic-api-key`), deterministic with a seed parameter, prefixes match the `AKIA-FAKE-TEST-FIXTURE-` regex already allow-listed in `.gitleaks.toml`.
- `packages/testing/src/setup.ts` — calls `expect.extend({ toBeNonEmpty })`. Wired by both per-package and root vitest configs via `setupFiles: ["@argus/testing/setup"]`.
- Root `vitest.config.ts` — `test.projects: ["packages/testing/vitest.config.ts"]` plus aggregated coverage with the same 85/80 thresholds.
- Root `tsconfig.json` (new, minimal) — exists primarily so `typescript-eslint`'s `projectService: true` can find the root `vitest.config.ts`. Excludes `apps/` and `packages/` (each has its own tsconfig).
- Root `package.json` — `pnpm test` is now `vitest run --coverage` (aggregated). `pnpm test:packages` runs `turbo run test` (per-package). `pnpm test:watch` runs `vitest`. Added `vitest` and `@vitest/coverage-v8` to root devDeps so the root binary resolves.
- `turbo.json` — added `inputs` to the `test` task so Turbo invalidates the per-package cache on the right files (`src/**`, `tests/**`, `package.json`, `tsconfig.json`, `vitest.config.ts`).
- Smoke test in `packages/testing/tests/smoke.test.ts` (9 tests, 100% coverage) — exercises the matcher pass/fail paths via `expect(() => …).toThrowError(…)`, validates `defineProjectConfig` returns the merged shape, and asserts `fakeSecret` determinism and prefix shape.

PRs in this session:

- _pending_ — branch `p0-04-vitest-infrastructure` (stacked on `p0-03-lint-format-secrets`; rebase onto main once P0-03 merges)

---

## What I Did NOT Do (Deferred)

- **No second workspace package.** The phase doc explicitly forbids placeholder source in app/library packages outside `packages/testing` ("Don't add real source code yet"). The original handover suggested "verify another package's test can import and use it" — I left that gap deliberately. Cross-package consumption will be exercised by the first real package in Phase 1 (`packages/core`). The import surface is in place; nothing here will need to change to support it.
- **No CI changes.** The phase doc assigns `typecheck` / `test` / `build` jobs to P0-05. The lint / format / commitlint / secret-scan jobs are unchanged and still pass.
- **No diff-based coverage.** The principles say "≥85% line, ≥80% branch on NEW code." Vitest enforces totals, not diff-coverage. Defer the diff tool to P0-05 alongside the CI work — likely a separate `vitest-coverage-report-action` or a custom script.
- **No `vitest.workspace.ts`.** Vitest 4 deprecated the workspace file in favour of `test.projects` inside `vitest.config.ts`. I went with the modern form. If you read older docs that still mention `vitest.workspace.ts`, ignore them.
- **No snapshot tests.** The previous handover recommended against them; I agree and did not introduce any. If you want to enforce, add `vitest/no-snapshot` (no such rule exists yet) or an ESLint custom rule later.
- **No `lint-staged` (still).** Same reasoning as P0-03 — the hook is fast enough at this size. Revisit when packages multiply.
- **No `gh pr create`.** `gh` auth is still broken on this machine (same as the last three handovers). Branch was pushed; PR needs to be opened from the GitHub UI.
- **PR #1 / #2 sequence assumes P0-03 lands first.** Because P0-03 was committed but never merged (no PR opened — gh auth), this branch is stacked on `p0-03-lint-format-secrets`. The PR diff will include P0-03's commit until that lands. Either (a) open P0-03's PR first and merge it, then rebase this branch onto main, or (b) open both PRs and merge P0-03 → P0-04 in order.

---

## Gotchas & Surprises

1. **Vitest 4 does not re-export `SyncExpectationResult`.** The first matcher draft used `SyncExpectationResult`, which is imported but not re-exported by `vitest`. Use `MatcherResult` (aliased from `@vitest/expect`'s `ExpectationResult`) instead. The relevant re-export lives at `vitest/dist/index.d.ts` line 15.
2. **`Matchers<T = any>` type-parameter mismatch.** Augmenting `vitest`'s `Matchers` requires the default to be `any` (declaration merging is strict about identical type parameters). The repo bans `any` via ESLint — I left a single justified disable comment with a block-comment explaining the constraint and pointing at the upstream `.d.ts`. Don't refactor that comment away without changing the augmentation pattern.
3. **Root `vitest.config.ts` was invisible to ESLint's projectService.** Symptom: `Parsing error: <file> was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProject.` Fix: minimal root `tsconfig.json` that only includes `vitest.config.ts`. Don't expand its `include` to cover `apps/**` or `packages/**` — that would double-register every file with its package-level tsconfig and cause type-aware-rule churn.
4. **`@types/node` peer-dep range matters.** I first installed `@types/node@22.10.5` and got a peer warning from `vite@8` ("requires `^20.19.0 || >=22.12.0`"). Bumped to `22.19.19`. If you upgrade Vite or Vitest, re-check the peer range — `pnpm view vite peerDependencies @types/node`.
5. **Vitest config files are not included in v8 coverage by default**, even when they live under `src/**`. That's why `defineProjectConfig` showed 50% line coverage initially — vitest reads the config at startup but doesn't instrument the file. I added a direct unit test in `smoke.test.ts` that calls `defineProjectConfig()` to bring it to 100%.
6. **Type-augmentation files have zero statements but show up in coverage tables.** `packages/testing/src/matchers/types.ts` is `export {}` + a `declare module` — the per-package coverage table listed it at 0/0/0/0 even though it's not real code. Excluded via `src/**/types.ts` in the shared coverage config. Keep the convention: any future `types.ts` files (module augmentation only) inherit the exclude automatically.
7. **Two coverage thresholds.** The shared `defineProjectConfig` puts thresholds on per-package coverage; root `vitest.config.ts` puts thresholds on the aggregated report. Both pass at 100% today, but they ARE independent — adding a new project without enough tests will fail the root threshold even if the per-project one passes (because the root threshold is computed against the union of all files).
8. **`pnpm test` and `pnpm test:packages` produce different outputs.** Root invocation uses Vitest projects (one report). Turbo invocation runs per-package vitest (per-package report). Pick the right one for CI in P0-05; my recommendation is `pnpm test` for the green-bar check + coverage gate, with `pnpm test:packages` reserved for parallelism when packages grow.

---

## State of the System

- ✅ `pnpm install` clean (235 packages, +56 from this PR — vitest + transitive)
- ✅ `pnpm lint` exits 0
- ✅ `pnpm format:check` exits 0
- ✅ `pnpm typecheck` exits 0 (1 package: `@argus/testing`)
- ✅ `pnpm test` exits 0 — 9 tests passing, 100% statements/branches/functions/lines
- ✅ `pnpm test:packages` (Turbo) exits 0 with identical results
- ✅ `.husky/pre-commit` end-to-end exit 0 with the staged change
- ✅ Coverage thresholds (85% line / 80% branch) enforced and well above floor
- ⏸ CI: existing P0-03 jobs (lint, format, commitlint, secret-scan) unchanged; typecheck/test/build jobs land in P0-05
- ⏸ Branch protection: still not enabled (requires admin to flip on)
- ⏸ Dogfood scan: still N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-05 — GitHub Actions CI pipeline** in this order:

1. Re-read [`docs/plan/phases/phase-00-foundation.md`](../plan/phases/phase-00-foundation.md) — P0-05 section
2. Look at the existing [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — it has four jobs (`lint`, `commitlint`, `secret-scan`); extend with `typecheck`, `test`, and `build`. Reuse the same `pnpm/action-setup@v4` + `setup-node@v4` + `node-version-file: package.json` boilerplate and the `ARGUS_SKIP_GITLEAKS_INSTALL=1` + `HUSKY=0` env that the existing jobs already use
3. Wire Turbo remote cache. Open Decision: Vercel Remote Cache (hosted, one click via `TURBO_TOKEN` + `TURBO_TEAM` secrets) vs self-hosted `turbo-cache` (Docker image, more setup, no vendor lock-in). Both work — Vercel is faster to ship. File this as an Open Decision in IMPLEMENTATION.md and pick one; if you defer, also defer the cache wiring to a follow-up
4. Decide on a coverage gate. Recommend running `pnpm test` (aggregated) with `--coverage` and uploading `coverage/lcov.info` to a service (Codecov, Coveralls) OR using `vitest-coverage-report-action` to comment on PRs. Avoid blocking on diff-coverage tooling — the thresholds in vitest.config.ts are already enforced
5. Add a `build` job that runs `pnpm build` (Turbo no-op today but real once packages ship source)
6. Acceptance: pipeline under 10 minutes on a typical change with Turbo cache hits. Cold builds will be slower — that's fine
7. Branch protection — write a note in your PR description asking a repo admin to enable "Require status checks" for `lint`, `typecheck`, `test`, `build`, `secret-scan`, `commitlint`. This is the same ask the last two handovers have flagged; please surface it in the PR body so it actually gets done
8. Update IMPLEMENTATION.md & rewrite HANDOVER.md, archive this one to `docs/handovers/p0-04-vitest-infrastructure-handover.md`
9. Open PR — and ideally merge P0-03 and P0-04 first so this one is rooted on main

Estimated effort: **M** (matches the phase doc).

---

## Open Questions for the Next Agent

- **Turbo remote cache: Vercel vs self-hosted?** No strong opinion. Vercel is one secret pair away; self-hosted is one Docker container away. File as an Open Decision before you write the YAML so it doesn't churn later.
- **Should `pnpm test` in CI run via vitest projects mode or via Turbo?** I recommend vitest projects mode (`pnpm test`) — one aggregated coverage artefact, simpler upload, matches local dev. Turbo-orchestrated tests (`pnpm test:packages`) are still available if a future job needs per-package parallelism.
- **Diff-coverage enforcement.** Vitest's threshold is total-coverage, not diff-coverage. The principles say "≥85% line, ≥80% branch on NEW code." Options: (a) accept total-coverage as a proxy until packages grow; (b) add `dorny/test-reporter` or a custom step that computes line-level diff coverage from `lcov.info` + the PR diff. I'd defer (b) to P0-08 or after.
- **Should `@argus/testing` be published?** Probably not — it's internal. Keep `"private": true` (already set). Revisit only if we want to share the matchers/fixtures with downstream consumers of the open-source release.
- **Browser-mode tests.** Vitest 4 has a stable browser mode (Playwright/WebDriverIO). No need yet — web UI lands in P7. Mention to whoever picks up P7 that the test substrate already supports it via per-project `environment: "browser"`.

---

## Files Touched This Session

```
.work/P0-04.md                                          [created — gitignored]
docs/IMPLEMENTATION.md                                  [modified — P0-04 → Recently Completed]
docs/HANDOVER.md                                        [modified — this file]
docs/handovers/p0-03-lint-format-secrets-handover.md    [created — archive of previous handover]
package.json                                            [modified — vitest+@vitest/coverage-v8 devDeps, new test scripts]
pnpm-lock.yaml                                          [modified — +56 packages]
tsconfig.json                                           [created — root, primarily for ESLint projectService]
turbo.json                                              [modified — test.inputs scoping]
vitest.config.ts                                        [created — root projects + aggregated coverage]
packages/testing/package.json                           [created]
packages/testing/tsconfig.json                          [created]
packages/testing/vitest.config.ts                       [created]
packages/testing/src/index.ts                           [created — barrel]
packages/testing/src/config.ts                          [created]
packages/testing/src/setup.ts                           [created]
packages/testing/src/fixtures/index.ts                  [created]
packages/testing/src/fixtures/fake-secret.ts            [created]
packages/testing/src/matchers/index.ts                  [created]
packages/testing/src/matchers/types.ts                  [created]
packages/testing/src/matchers/to-be-non-empty.ts        [created]
packages/testing/tests/smoke.test.ts                    [created]
```

---

## Sign-off

The monorepo now has a working test substrate with aggregated coverage at 100%. P0-05 can extend CI on a stable, green baseline.

— claude-opus-4-7
