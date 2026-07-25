# Argus — Maintainer & Contributor Guide

> For someone who wants to work on Argus internals. **This guide fills in progressively** — each recipe is written the first time its pattern is built, while the knowledge is fresh (see [`../plan/03-documentation.md`](../plan/03-documentation.md)). Today most patterns don't exist yet (Phase 1, Domain Core).

## Start here

- **How it fits together:** [`../architecture.md`](../architecture.md).
- **Where code goes + forbidden imports:** [`../plan/01-repo-structure.md`](../plan/01-repo-structure.md).
- **Engineering principles:** [`../plan/00-principles.md`](../plan/00-principles.md).
- **Workflow, gates, licensing guardrails:** [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).
- **A package's internals:** that package's own `README.md` (e.g. [`../../packages/core/README.md`](../../packages/core/README.md)).

## Recipes (fill in as each pattern first ships)

One page per repeatable extension point. Each is a placeholder until the first instance is built — at which point the person who built it writes the recipe from real experience.

| Recipe                                                           | "How do I add another…"                                   | Arrives with                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`adding-a-language.md`](./adding-a-language.md)                 | supported source language (tree-sitter grammar + wiring)  | ✅ P1-03 (`@argus/ast`)                                                    |
| [`adding-a-rule.md`](./adding-a-rule.md)                         | rule module against the engine                            | 🟡 P1-04 (module contract) · fixture conventions with first rule (Phase 2) |
| `adding-a-tool-adapter.md`                                       | external-tool adapter (behind the `ToolAdapter` boundary) | first adapter (Phase 4)                                                    |
| [`adding-a-report-formatter.md`](./adding-a-report-formatter.md) | output format for `argus check --format`                  | ✅ P2-04 (`--format json`) · widens to `reports/formatters/` in Phase 8    |
| `adding-a-persistence-backend.md`                                | storage backend behind the repository ports               | first backend (Phase 5)                                                    |
| [`testing.md`](./testing.md)                                     | fakes, builders, property-based testing (fast-check)      | 🟡 P1-06 (property pattern) · expands from now                             |

## Conventions worth knowing now

- **Domain conventions** (branded primitives, `Result`-returning factories, frozen outputs, injected time) are summarised in [`../architecture.md`](../architecture.md#domain-conventions-how-core-is-built) and used uniformly — follow them, don't reinvent.
- **Public exports carry TSDoc** — it's both in-editor help and the source for the Phase 11 generated reference.

## Mutation testing (weekly, report-only)

100% coverage proves the tests _execute_ the code; the weekly [Stryker](https://stryker-mutator.io/) run ([`mutation.yml`](../../.github/workflows/mutation.yml), Tuesdays 12:00 UTC + manual dispatch) proves they _assert_ on it. Locally: `pnpm mutation` (~30s at current size; grows with the codebase), report at `reports/mutation/index.html`. Config: [`stryker.config.mjs`](../../stryker.config.mjs) — **report-only** (`thresholds.break: null`) until the baseline stabilises; the score lives in [`IMPLEMENTATION.md`](../IMPLEMENTATION.md) → Metrics Snapshot. Reading survivors: a surviving mutant means no test failed when that statement was broken — either add the missing assertion or consciously accept it (e.g. error-message wording). No TypeScript checker is wired in (doubles runtime), so a survivor can also be type-invalid noise — check before chasing it.
