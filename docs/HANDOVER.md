# Handover — P1-05 complete

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-19
**Phase:** P1 — Domain Core (5/6 tasks done)
**Last task completed:** P1-05 — Config system (PR pending merge — see tracker)

---

## Context

`@argus/config` turns `reviewtool.yaml` into a frozen `ResolvedConfig`: strict zod schema (rule ids through core's `ruleId`), `yaml`-package parsing that keeps positions so every error carries `file:line:col` + dot-path, ESLint-style `extends:` (relative, cycle-detected), cosmiconfig discovery, and `loadHierarchy` merging org→team→repo→path nearest-wins. **Next: P1-06 — Domain services** (`packages/core/src/services/` — LayerClassifier, ConformanceScorer, SuppressionEvaluator; pure functions, property-based tests with fast-check = a **new dev dependency to vet**). P1-06 is the **last P1 task** — after it merges, run the phase transition (exit criteria, phase-completion handover, tracker flip to P2).

## Conventions established in P1-05 (follow, don't reinvent)

- **Config vocabulary comes from core** — severities via `SEVERITIES`, languages via `LANGUAGES`, rule ids via `ruleId`. Never re-declare enums in a schema.
- **Absence is not an error:** discovery (`search`, `loadHierarchy`) returns `ok(undefined)` when no config exists. Reserve `ConfigError` for real failures.
- **Merge semantics are fixed** (and guide-documented): `rules` per-rule-id wholesale replace; `languages`/`ignore` replace, never concatenate; `extends` consumed by resolution. P2 orchestration must not invent new blending.
- **`validateConfigText(file, text)`** is the fs-free seam — editors/LSP (P10) validate buffers through it; don't add a parallel path.
- **Error shape:** `ConfigError.issues[]` each with `file`, 1-based `line`/`column`, dot-`path`, `message`. Formatting lives in one place (`errors.ts`).

## Gotchas for the next sessions

1. **cosmiconfig 9 does NOT search upward by default** — `searchStrategy: "global"` is set deliberately; removing it silently breaks nearest-file discovery (tests pin it).
2. **`yaml` error positions:** `prettyErrors: false` + compute from `error.pos[0]` via `LineCounter`. With prettyErrors on you get code-frame noise in messages; `linePos` on errors exists only in pretty mode — don't "simplify" back to it.
3. **Prettier chokes on deliberately-broken fixtures** — `bad-syntax.yaml` is in `.prettierignore`; any future malformed fixture needs the same or pre-commit fails.
4. **YAML 1.2 semantics are pinned by test:** unquoted `off` is the _string_ `"off"`, not `false`. Touching parse options can flip this — the test will catch it.
5. **fast-check for P1-06:** new dev-dep — full ADR-0003 dance (age, license, scripts) + tracker record. It's test-only, so it belongs in devDependencies of `packages/core`; check whether the coverage exclusions and Stryker need any accommodation for property tests (shrinking can be slow under mutation — consider excluding property suites from Stryker if the weekly run balloons).
6. **P1-06 services are core-internal** (`packages/core/src/services/`) — the core cruiser rules (nothing but neverthrow) apply; fast-check must stay in tests, never in `src/`.
7. Root gates before every push (`pnpm lint && pnpm typecheck && pnpm build && pnpm test`) — filtered runs bypass the task graph.

## Maintainer admin items (carried over + new)

1. **Merge P1-05** (PR link in tracker).
2. **D-7 (new):** config file name — `reviewtool.yaml` is the plan's name but reads as the pre-rename working title; recommendation is `argus.yaml` at the Phase-2 boundary. Ruling wanted before MVP.
3. D-1: Turbo remote cache decision (still open).
4. Dependabot queue ([#21](https://github.com/WeaversMask/argus-oss/pull/21) + force-updated branches) — merge or close.
5. `nvm alias default 22` — confirm resolved and drop next rotation.
6. Archive the retired `argus` repo · delete `~/argus-pre-scrub-backup.bundle` when satisfied · `NPM_TOKEN`/`LICENSE`/private-vuln-reporting stay in the go-public bucket.

## State of the System

- ✅ Root gates green on the branch: 292 tests (core 126, testing 33, ast 45, rule-engine 49, config 39), aggregate 99.0%/96.9%/100%; lint/typecheck/build/boundaries clean
- ✅ License gate: 561 packages, 4 named exceptions — zod/cosmiconfig/yaml were already tooling transitives (no notices delta)
- ✅ Cruiser rule `config-public-entry-only` negative-tested (plant fired rule + backstop, removed)
- ✅ First user-facing guide page exists: `docs/guide/configuration.md`
- ⏸ P1-05 PR pending human merge (tracker + this handover ride in it)
- ⏸ `suppressions:`/`layers:` schema sections deferred by design (P2 / P3-01)

## Sign-off

The hexagon can now read its own instructions: strict at the boundary, line-accurate when you get it wrong, nearest-file-wins when teams disagree. One task left in the phase — keep the services pure and the clock injected.

— claude-fable-5
