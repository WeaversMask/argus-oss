# Argus — Architecture

> The map of how Argus fits together. Start here to understand the system, then read a package's own `README.md` for its internals. This document grows with the codebase; it currently reflects **Phase 2 (MVP)** — Argus is runnable, but most of the planned graph is still ahead.

## The shape

Argus is a **pnpm-workspaces monorepo** (Turborepo for build orchestration) organised around a **ports-and-adapters** (hexagonal) core:

- **`packages/core`** is the gravitational centre — the pure domain model and the port interfaces. It depends on nothing internal; everything depends on it.
- **Adapters** implement core's ports against the outside world (external tools, databases, CI systems) and are swappable without touching the domain.
- **Apps** (`cli`, `server`, `web`, …) are thin: they wire adapters to orchestrators and own no business logic.

The full intended tree and the forbidden-import rules that enforce this live in [`plan/01-repo-structure.md`](./plan/01-repo-structure.md). The reasoning behind the layering is in [`plan/00-principles.md`](./plan/00-principles.md).

**The boundaries are mechanically enforced** (OPS-04): [`.dependency-cruiser.cjs`](../.dependency-cruiser.cjs) runs in CI (`pnpm boundaries`) and fails the build if `packages/core/src` imports anything but `neverthrow` (Node builtins included), if any import crosses a package boundary other than through the target's public `exports` entry points (one `*-public-entry-only` rule per package, mirroring its `exports` map exactly), or if the one-way, type-only-in-src `testing → core` edge is violated. Since P2-02 the cruise also covers `apps/` and enforces the inward-flow direction: no `packages/*` module may import anything under `apps/*` (`packages-never-import-apps`). Apps need no public-entry rule of their own — nothing imports them — but their own imports are already governed by each package's `*-public-entry-only` rule, which fires for any importer outside that package. When a package's public surface changes — or a package is born — its `exports` map and its per-package rule change together. Phase-2 dogfooding will reinforce, not replace, these rules.

## What exists today

Six packages and one app are real; the rest of the tree in `01-repo-structure.md` is planned.

| Package                                                       | Role                                                                                                                                                                                                                                   | README                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`@argus/core`](../packages/core/README.md)                   | The domain model + the port interfaces adapters implement: entities, value objects, errors, ports, and pure domain services (layer classification, conformance scoring, suppression matching). Pure, frozen, zero infrastructure deps. | [`packages/core/README.md`](../packages/core/README.md)                   |
| [`@argus/testing`](../packages/testing/README.md)             | Shared test infrastructure: Vitest config, custom matchers, fixtures, and in-memory fakes for every core port. Consumed only by other packages' tests.                                                                                 | [`packages/testing/README.md`](../packages/testing/README.md)             |
| [`@argus/ast`](../packages/ast/README.md)                     | The first real port implementation: tree-sitter (wasm, [ADR-0005](./adr/0005-ast-adapter-wasm-tree-sitter.md)) behind `AstParserPort` — parses TS/JS/Python into frozen domain `AstNode`s; visitor + S-expression queries.             | [`packages/ast/README.md`](../packages/ast/README.md)                     |
| [`@argus/rule-engine`](../packages/rule-engine/README.md)     | The hot path behind `RuleRunnerPort`: one AST walk per file, node-type dispatch to registered rule modules, frozen rule contexts, deterministic violations; `Runner` aggregates across files. Depends on core only.                    | [`packages/rule-engine/README.md`](../packages/rule-engine/README.md)     |
| [`@argus/config`](../packages/config/README.md)               | The config system: zod-validated `argus.yaml`, cosmiconfig discovery, `extends:` chains, hierarchical merging (nearest wins), errors with exact YAML line/column. The config-loading edge of the hexagon.                              | [`packages/config/README.md`](../packages/config/README.md)               |
| [`@argus/rules-builtin`](../packages/rules-builtin/README.md) | The first real `RuleModule` consumers of the engine: ten quality/style/docs/testing checks for TS/JS ([rule reference](./guide/rules.md)). Fixture-driven TDD against a real parser + engine. What makes `argus check` find things.    | [`packages/rules-builtin/README.md`](../packages/rules-builtin/README.md) |
| [`@argus/cli`](../apps/cli/README.md)                         | **The first app** (`apps/cli`): `argus check \| init \| explain` ([CLI guide](./guide/cli.md)). Owns no analysis logic — it wires config, parser, engine, and rules into a pipeline and maps outcomes onto exit codes 0/1/2.           | [`apps/cli/README.md`](../apps/cli/README.md)                             |

The **ten port interfaces** live in `packages/core/src/ports/` (P1-02) — the hexagonal boundary — and `@argus/testing` ships an in-memory fake for every one. `@argus/ast` (P1-03) is the first adapter to implement one for real; `@argus/rules-builtin` (P2-01) is the first library of checks written against `@argus/rule-engine`; the remaining adapters, persistence, and apps arrive from Phase 2 onward.

## Domain conventions (how `core` is built)

These conventions are uniform across the domain and are the fastest way to read the code without surprises:

- **Branded primitives** — a bare `string` is never an id; ids/paths/timestamps are branded types built through factories.
- **Factories return `Result<T, ValidationError>`** (via `neverthrow`) and collect **all** validation issues, not just the first.
- **Outputs are deep-frozen** — domain values are immutable once constructed.
- **Time is injected** as a branded epoch-ms `Timestamp`; the domain never reads the clock itself.
- **`Scan` is a discriminated union** (queued / running / completed / failed) with narrow-typed transitions, so an invalid state move is a compile error.
- **Composite factories re-validate** their embedded components (see [ADR-0004](./adr/0004-domain-model-boundary-semantics.md)).

Follow these when extending the domain; don't reinvent them.

## Data flow (target, from Phase 2)

The intended runtime path once the MVP lands:

```
source tree ──▶ AST adapter ──▶ rule engine ──▶ findings ──▶ report formatters ──▶ output
                                    ▲
                              rules (built-in + config)
```

Each arrow crosses a port boundary, so any stage is replaceable. This section will be filled in with specifics as those packages ship.

## Going deeper

- **Use it:** [`guide/`](./guide/) — running Argus and configuring it (fills in from Phase 2).
- **Extend it:** [`dev/`](./dev/) — recipes for adding rules, adapters, formatters (fills in as each pattern first ships).
- **Why decisions were made:** [`adr/`](./adr/).
