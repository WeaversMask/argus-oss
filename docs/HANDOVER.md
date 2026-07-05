# Handover — P1-01 complete

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-05
**Phase:** P1 — Domain Core (1/6 tasks done)
**Last task completed:** P1-01 — Core domain entities ([argus-oss#10](https://github.com/WeaversMask/argus-oss/pull/10), pending merge)

---

## Context

`@argus/core` exists and holds the full Phase-1 domain model (107 tests, 100% coverage everywhere). **Next: P1-02 — Core port interfaces** (recommended: it unblocks P1-03/P1-04, the phase's long pole; P1-05/P1-06 are also unblocked). Branch from `main` after #10 merges — #10 owns this tracker/handover state. Independent review packet is on the PR.

## Domain conventions established in P1-01 (follow these, don't reinvent)

- **Branding:** `Brand<T, B>` from `packages/core/src/domain/brand.ts` (unique-symbol, hand-rolled — decided against type-fest). Branded values only exist via their validating factories.
- **Factories:** return `Result<T, ValidationError>` (neverthrow) and collect **all** issues via the shared `Validator` in `src/domain/validation.ts` (internal, not exported from the barrel). Outputs are deeply `Object.freeze`d.
- **Optional keys** are constructed conditionally (`...(x !== undefined ? { x } : {})`) — `exactOptionalPropertyTypes` is on; tests assert absent keys with `"key" in obj`.
- **Time:** branded epoch-ms `Timestamp`, always injected — no `Date.now()` in core, ever.
- **Scan is a discriminated union** (`QueuedScan | RunningScan | CompletedScan | FailedScan`); transitions take the narrow member type so wrong-status moves don't compile. Extend this pattern rather than adding nullable fields.
- Errors live in `src/errors/` (`DomainError` base with `code`; `ValidationError`, `ScanTransitionError`).

## Gotchas for P1-02 (the ones that will actually bite)

1. **Workspace dep cycle ahead:** P1-02 puts in-memory fakes in `packages/testing/src/mocks/`, so `@argus/testing` must depend on `@argus/core` types — but `@argus/core` already devDepends on `@argus/testing` (vitest config). pnpm tolerates dev-only cycles, but decide deliberately: type-only imports in the fakes, or fakes as a separate export path. Flag it in the PR either way.
2. **Every shell needs Node 22 first:** `source ~/.nvm/nvm.sh && nvm use` before any `pnpm`/`git commit` (hooks run node) — `nvm alias default 22` still pending (admin item). Bare `pnpm` in a fresh shell dies on Node 20.
3. **New-package checklist** (if P1-02 creates none, skip): compose named volume + Dockerfile mountpoint line, root `vitest.config.ts` projects entry, `pnpm notices` when the dep tree changes.
4. `.work/` is **gitignored** — task files are local-only; put the durable content in the PR.
5. Ports are interface-only files → v8 coverage sees no runtime; the `quality-gates.md` coverage-exception list applies (document exclusions in the package `vitest.config.ts` with justification).
6. Session hygiene: sync main first; context budget 50→70%; permission-prompt description policy; review tier full-packet for anything in core.

## Maintainer admin items (carried over, still pending)

1. Archive the retired `argus` repo (Settings → Archive).
2. D-1: Turbo remote cache decision.
3. Dependabot PRs #1–#7.
4. `nvm alias default 22` on the dev machine.
5. Delete `~/argus-pre-scrub-backup.bundle` when satisfied.
6. `NPM_TOKEN` / `LICENSE` placeholder / private-vuln-reporting — go-public bucket, unchanged.

## State of the System

- ✅ All green: 116 tests (100% aggregate coverage), lint/typecheck/build, license gate (479 pkgs), notices current
- ⏸ [argus-oss#10](https://github.com/WeaversMask/argus-oss/pull/10) open (P1-01 + this tracker state), pending human merge
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

The domain speaks its own language now — branded, frozen, and total. P1-02 gives it ports; after that the engine.

— claude-fable-5
