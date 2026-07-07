# Handover — D-2/3/4 ruled + implemented (P1-01a); P1-02 started

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-06
**Phase:** P1 — Domain Core (1/6 tasks done; P1-01a follow-up in review)
**Last task completed:** P1-01a — ruled decisions implemented ([argus-oss#11](https://github.com/WeaversMask/argus-oss/pull/11), pending merge)

---

## Context

The maintainer ruled **option (a) on all of D-2/D-3/D-4** in session (2026-07-06) — recorded in [ADR-0004](./adr/0004-domain-model-boundary-semantics.md), implemented and tracker-flipped in [#11](https://github.com/WeaversMask/argus-oss/pull/11):

- **D-2a:** composite factories (`violation`, `finding`, `scanResult`, `layerManifest`) re-validate embedded components via the new internal `Validator.embed` (path-prefixed issues, factory's frozen copy embedded). Extended to `completeScan`, which rebuilds its `ScanResult` (re-derives `countsBySeverity`); its error union is now `ScanTransitionError | ValidationError`.
- **D-3a:** `Position` is **1-based, end-exclusive** (LSP/SARIF/tree-sitter aligned). TSDoc-only change. Every adapter converts against this — P1-03 must ship `+1` conversion contract tests (in-range off-by-ones pass validation; that residual risk is in ADR-0004).
- **D-4a:** `Suppression` stays project-agnostic; **`SuppressionRepositoryPort` takes a `ProjectId` query parameter** — this binds P1-02's port design.

## P1-02 — Core port interfaces (IN PROGRESS, no code yet)

- Branch **`p1-02-core-ports`** exists, cut from main **without** #11 — **rebase onto main once #11 merges** before completing.
- Full design plan, settled decisions (async convention, core-owned AST contract, port errors, dep-cycle defusal, coverage exception), declared file set, and work order are in **`.work/P1-02.md`** (gitignored, local to this machine). Read it before writing any port.
- Tracker already shows P1-02 in progress (#11's tracker commit). Complete the tracker flip in the P1-02 PR itself.

## Domain conventions (unchanged from P1-01 — follow, don't reinvent)

Branded primitives via `Brand<T,B>`; factories return `Result<T, ValidationError>` collecting **all** issues; outputs deep-frozen; optional keys constructed conditionally (`exactOptionalPropertyTypes`); time injected as branded epoch-ms `Timestamp`; `Scan` is a discriminated union with narrow-typed transitions. Composites now also re-validate embedded components (D-2a) — extend that pattern to any new composite.

## Gotchas (will actually bite)

1. **Every shell needs Node 22 first:** `source ~/.nvm/nvm.sh && nvm use` before any `pnpm`/`git commit` — `nvm alias default 22` still pending (admin item).
2. **Workspace dep cycle** for P1-02 fakes: `@argus/testing` needs `@argus/core` types while core devDepends on testing — planned defusal is type-only imports (details in `.work/P1-02.md`); flag it in the PR.
3. Ports are interface-only → no runtime for v8 coverage; document the exclusion in the package `vitest.config.ts` per quality-gates.md.
4. Prettier reflows Markdown tables — run it before staging.
5. Session hygiene: sync main first; context budget 50→70%; full-packet review tier for anything in core.

## Maintainer admin items (carried over + new)

1. **Merge [#11](https://github.com/WeaversMask/argus-oss/pull/11)** — unblocks P1-02 completion (rebase) and P1-03.
2. Archive the retired `argus` repo (Settings → Archive).
3. D-1: Turbo remote cache decision (only decision still open).
4. Dependabot PRs #1–#7.
5. `nvm alias default 22` on the dev machine.
6. Delete `~/argus-pre-scrub-backup.bundle` when satisfied.
7. `NPM_TOKEN` / `LICENSE` placeholder / private-vuln-reporting — go-public bucket, unchanged.

## State of the System

- ✅ main green: 117 tests aggregate, lint/typecheck/build, license gate (479 pkgs)
- ⏸ [#11](https://github.com/WeaversMask/argus-oss/pull/11) open: D-2a/D-3a code (116 core tests, 100% coverage), ADR-0004, tracker flip, this handover — pending human merge
- ⏸ `p1-02-core-ports` branch: created, empty of code, plan in `.work/P1-02.md`
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

The model's ambiguities are ruled and closed; nothing structural is left to guess. Ports next — the design is written down, so P1-02 is execution, not invention.

— claude-fable-5
