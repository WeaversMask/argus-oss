# Handover — P1-04 complete

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-18
**Phase:** P1 — Domain Core (4/6 tasks done)
**Last task completed:** P1-04 — Rule engine (PR pending merge — see tracker)

---

## Context

The hexagon's hot path exists: `@argus/rule-engine` implements `RuleRunnerPort` — one iterative AST walk per file, node-type dispatch to registered `RuleModule`s, frozen `RuleContext`s, attributed `RuleExecutionError` containment, deterministic sorted violations; `Runner` aggregates across files (skip-and-collect). Benchmarked from day one: committed baseline in `tests/perf/baseline.ts` (0.5ms median M2 for 1000 nodes × 50 rules), CI gates at baseline ×20, gross regressions only. **Next: P1-05 — Config system or P1-06 — Domain services** (both dep on P1-01 ✅ only, parallel-eligible, spec in phase-01). Rule-author contract: [`docs/dev/adding-a-rule.md`](../dev/adding-a-rule.md).

## Conventions established in P1-04 (follow, don't reinvent)

- **Rule modules are the only integration point** — `Engine.register(module)`, zero engine changes per rule. Selectors: `"<nodeType>"` (enter), `"<nodeType>:exit"`, `"*"`/`"*:exit"`. No per-rule `skip`/`stop`: all rules share one walk (`@argus/ast`'s `visit` keeps those levers for standalone use).
- **rule-engine depends on `@argus/core` only.** It walks core's `AstNode` with its own iterative walk rather than importing the `@argus/ast` adapter. Keep that direction when wiring Phase-2 orchestration: parse with the adapter, hand `ParsedFile` to the engine.
- **Failure policy is layered:** rule crash (throw / async listener / invalid selector / invalid report / unregistered activation) fails that _file's_ run, attributed via `error.ruleId`; `Runner` skips-and-collects across files. No silent skips anywhere.
- **Determinism includes ids:** violation ids = URI-encoded file + rule id + position + report ordinal (`src/violation-id.ts`). Don't introduce randomness or clock reads into the run path.
- **Rules are synchronous by contract** — a Promise-returning `create`/listener is a contained failure, never awaited. Phase-2 rules must be written sync.
- **Benchmark-with-committed-baseline pattern** (first instance): `tests/perf/baseline.ts` (typed const, not JSON — no resolveJsonModule needed), local absolute budget (acceptance number) + CI `baseline × factor` gate. Re-baseline via PR only; never delete the gate to silence a flake — widen the factor in a PR.

## Gotchas for the next sessions

1. **Coverage excludes `src/**/index.ts` and `src/**/types.ts`** (shared vitest config) — pure-type modules are free, but don't put runtime code in a file named `types.ts`.
2. **New-package checklist worked verbatim** (P1-03's list, nothing new): vitest root `projects` entry · per-package cruiser rule + negative test · compose named volume + Dockerfile mkdir · `pnpm license-check`/`notices` (no delta this time — no new external deps; a date-only `THIRD-PARTY-NOTICES` diff is churn, restore it).
3. **`@typescript-eslint/require-await` bites test fixtures:** an `async () => ({})` misuse-fixture fails lint — write `(() => Promise.resolve({})) as unknown as T` instead.
4. **One uncovered branch in `engine.ts` is deliberate** (generated-id validation, unreachable by construction, documented in the package README) — don't chase it, don't delete it.
5. **Weekly Stryker now also mutates `rule-engine/src`** (glob). Watch the Tuesday run's wall time; scope/shard before touching thresholds.
6. Root gates before every push (`pnpm lint && pnpm typecheck && pnpm build && pnpm test`) — filtered runs bypass the task graph (P1-02 lesson, still true).

## Maintainer admin items (carried over + new)

1. **Merge P1-04** (PR link in tracker).
2. D-1: Turbo remote cache decision (only decision still open).
3. Dependabot [#21](https://github.com/WeaversMask/argus-oss/pull/21) open (npm minor/patch group; two more Dependabot branches were force-updated 2026-07-18 — check the queue).
4. `nvm alias default 22` — appeared resolved last rotation; confirm and drop.
5. Archive the retired `argus` repo · delete `~/argus-pre-scrub-backup.bundle` when satisfied · `NPM_TOKEN`/`LICENSE`/private-vuln-reporting stay in the go-public bucket.

## State of the System

- ✅ Root gates green on the branch: 252 tests (core 126, testing 33, ast 45, rule-engine 48), aggregate 99.3%/98%/100%; lint/typecheck/build/boundaries/license clean
- ✅ Benchmark: 1000 nodes × 50 rules median 0.49ms local M2 (budget 50; CI baseline×20 = 10ms, CI path exercised locally with `CI=1`)
- ✅ Cruiser rule `rule-engine-public-entry-only` negative-tested (planted deep import fired it + backstop, removed)
- ✅ Phase exit criterion "100 fixture rules across 10 fixture files without errors" covered now — Runner stress test in `tests/runner.test.ts` (20,000 aggregated violations, zero failures)
- ⏸ P1-04 PR pending human merge (tracker + this handover ride in it)
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

Fifty rules, one walk, half a millisecond. The engine trusts the adapter's frozen trees and repays the domain with deterministic violations — mind the sync-only contract when Phase 2 starts writing real rules.

— claude-fable-5
