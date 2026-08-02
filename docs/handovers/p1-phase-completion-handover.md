# Handover — Phase 1 complete (P1-06)

**From:** claude-fable-5
**To:** next picker (first P2 session)
**Date:** 2026-07-19
**Phase:** P1 — Domain Core ✅ 6/6 → **P2 — MVP** (Milestone M1 Showcase-Ready at its end)
**Last task completed:** P1-06 — Domain services + D-7 rename (PR pending merge)

---

## Phase 1 exit criteria — verified

1. **Domain model complete and frozen** ✓ — entities/value objects/errors stable since P1-01a; P1-06 added services without touching the model.
2. **Rule engine handles 100 fixture rules × 10 files without errors** ✓ — Runner stress test, `packages/rule-engine/tests/runner.test.ts` (20k violations).
3. **All ports have in-memory fakes** ✓ — ten fakes in `@argus/testing` (P1-02).
4. **Phase handover with glossary, rule-authoring guide, tree-sitter gotchas** ✓ — glossary below; rule authoring: [`dev/adding-a-rule.md`](../dev/adding-a-rule.md); tree-sitter version pinning: [`dev/adding-a-language.md`](../dev/adding-a-language.md) + [ADR-0005](../adr/0005-ast-adapter-wasm-tree-sitter.md) + `@argus/ast` README (grammar ABI window, smoke-test canary).

## Domain glossary (ubiquitous language — use these words exactly)

- **Scan** — one analysis run; a discriminated union `queued → running → completed | failed` with compile-safe transitions. **ScanResult** — a completed scan's aggregate.
- **Finding** — a located observation from an adapter, pre-domain-judgement. **Violation** — a confirmed rule breach (id, rule, severity, message, `Position`) — findings become violations.
- **Rule** — the static definition (id, name, description, default severity). **RuleActivation** — a rule switched on at a severity (or `"off"`) with opaque options. **RuleProfile** — a named activation set. **RuleModule** — a rule's implementation against the engine (`create(context) → listeners`).
- **Layer / LayerManifest / LayerBoundary** — declared architecture: named layers with glob patterns, and which layers each may import. **LayerConformance** — per-layer compliance figures (P1-06).
- **Suppression** — a justified, possibly-expiring decision to ignore a rule for matching paths; `reason` mandatory.
- **Project / Metrics / Severity (`info<warning<error<critical`) / Position (1-based, end-exclusive, UTF-16 columns — ADR-0004) / Timestamp (branded epoch-ms, always injected)**.
- **Brands everywhere:** `RuleId`, `FilePath`, `LayerName`, ids — never bare strings. Factories return `Result<T, ValidationError>` collecting all issues; outputs frozen.

## The five packages (all green, 346 tests, 99.0/96.8/100 aggregate)

`core` (model + ports + services, 100%) · `testing` (fakes for all ten ports) · `ast` (tree-sitter wasm behind `AstParserPort`) · `rule-engine` (`RuleRunnerPort`: one walk per file, benchmark-gated) · `config` (`argus.yaml` → `ResolvedConfig`, line-mapped errors).

## What P2 needs to know

1. **P2-01 rules are `RuleModule`s** — recipe exists ([`dev/adding-a-rule.md`](../dev/adding-a-rule.md)); sync-only listeners, anonymous node types dispatch, `context.report({message, position})`. TDD: ≥5 valid + 5 invalid fixtures per rule **before** implementation. Property tests where the rule states a law.
2. **Wiring order for `check`:** config (`ConfigLoader.search`) → parse (`TreeSitterAstParser`, **one instance per process** — grammar wasm is unfreeable) → engine per file → `Runner` aggregates → `matchingSuppression` filters (inject `now`) → `classifyLayer`/`scoreConformance` for reporting. Every piece exists; P2 composes them.
3. **`ignore` globs:** use core's `matchGlob` (exported) — don't add a glob dependency.
4. **Deferred into P2:** `suppressions:` config section (needs id/`createdAt` design — see P1-05 packet notes); orchestrator decides what config `ignore`/`languages` mean at scan time.
5. **Dogfooding starts at P2's end** — CI runs Argus on Argus; every PR then needs zero new self-violations. The M1 showcase tail (DOC-02/03/04, OPS-05) closes the phase; **going public stays maintainer-only**.
6. **Perf budget:** `check` <30s on 50k lines, benchmarked per PR (phase note). The committed-baseline pattern from P1-04 (`tests/perf/baseline.ts`) is the template.
7. **New-package checklist** (per new package: rules-builtin, orchestrator, apps/cli…): vitest root `projects` entry · per-package cruiser rule + negative test · compose volume + Dockerfile mkdir · license gate/notices · README. `apps/*` will need cruiser rules written fresh (first non-`packages/` workspace member — check `pnpm-workspace.yaml` includes `apps/*`!).

## Evergreen gotchas (carried forward)

- Root gates before every push; filtered runs bypass the task graph.
- prettier reflows Markdown tables and cannot parse deliberately-broken fixtures (`.prettierignore` them).
- commitlint: header ≤100 chars — a failed commit leaves files staged; don't let the next commit sweep them.
- pnpm 11 scaffolds `allowBuilds` placeholders into `pnpm-workspace.yaml` when a new dep has install scripts — replace with an explicit decision.
- `gh pr edit` fails on this machine (projectCards GraphQL deprecation) — PATCH via `gh api` instead.
- Weekly Stryker now mutates `core/services` + everything else; property tests shrink slowly under mutation — watch the Tuesday wall time.

## Maintainer admin items

1. **Merge P1-06** (PR link in tracker) — completes Phase 1.
2. D-1: Turbo remote cache (last open decision).
3. Dependabot queue ([#21](https://github.com/WeaversMask/argus-oss/pull/21) + branches).
4. `nvm alias default 22` — confirm and drop.
5. Retired-repo archive · pre-scrub bundle deletion · go-public bucket (`NPM_TOKEN`, LICENSE, private-vuln-reporting) — unchanged.

## Sign-off

Phase 1 closes with the hexagon whole: a frozen model, ten ports, a real parser, a benchmarked engine, a strict config loader, and pure services to judge what they find — 346 tests standing watch. Phase 2 makes it a tool: point it at code, print the truth, then point it at itself.

— claude-fable-5
