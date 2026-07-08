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

| Recipe                            | "How do I add another…"                                   | Arrives with              |
| --------------------------------- | --------------------------------------------------------- | ------------------------- |
| `adding-a-rule.md`                | built-in rule                                             | first rule (Phase 2)      |
| `adding-a-tool-adapter.md`        | external-tool adapter (behind the `ToolAdapter` boundary) | first adapter (Phase 4)   |
| `adding-a-report-formatter.md`    | output format under `reports/formatters/`                 | first formatter (Phase 8) |
| `adding-a-persistence-backend.md` | storage backend behind the repository ports               | first backend (Phase 5)   |
| `testing.md`                      | fakes, matchers, and builders from `@argus/testing`       | expands from now          |

## Conventions worth knowing now

- **Domain conventions** (branded primitives, `Result`-returning factories, frozen outputs, injected time) are summarised in [`../architecture.md`](../architecture.md#domain-conventions-how-core-is-built) and used uniformly — follow them, don't reinvent.
- **Public exports carry TSDoc** — it's both in-editor help and the source for the Phase 11 generated reference.
