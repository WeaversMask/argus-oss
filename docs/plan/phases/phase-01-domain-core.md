# Phase 1 — Domain Core & Rule Engine

> **Self-contained phase doc.** When done, set Current Phase to P2 and load [`phase-02-mvp.md`](./phase-02-mvp.md).

**Duration:** ~3 weeks
**Demoable:** Unit tests only — no user-visible output
**Prerequisites:** Phase 0 complete

---

## Goal

The domain model and rule dispatch engine, with zero infrastructure dependencies. This is the heart of the system — every subsequent phase builds on it.

---

## Required Reading Before Starting

- [`../00-principles.md`](../00-principles.md) §1 (Architectural Principles) — especially the hexagonal/ports & adapters rule
- [`../01-repo-structure.md`](../01-repo-structure.md) — note `packages/core` constraints

---

## Tasks

### [P1-01] Core domain entities

- **Deps:** P0 complete
- **Outputs:** `packages/core/src/domain/*.ts`
  - `Scan`, `ScanMode`, `ScanResult`
  - `Violation`, `Severity`, `Position`
  - `Rule`, `RuleId` (branded type), `RuleProfile`
  - `Layer`, `LayerName`, `LayerManifest`, `LayerBoundary`
  - `Finding` (intermediate type from adapters before becoming Violations)
  - `Project`, `ProjectId`
  - `Suppression`, `SuppressionId`
  - `Metrics` (cyclomatic, cognitive, halstead bundles)
- **Acceptance:**
  - All entities are `readonly`; mutations return new instances
  - Branded types prevent confusion (a `RuleId` cannot be passed where a `ProjectId` is expected)
  - 100% test coverage on factory/validation logic
  - Zero imports from outside `packages/core`
- **Effort:** L

### [P1-02] Core port interfaces

- **Deps:** P1-01
- **Outputs:** `packages/core/src/ports/*.ts`
  - `AstParserPort`, `RuleRunnerPort`, `ToolAdapterPort`, `DependencyResolverPort`
  - `ScanRepositoryPort`, `ProjectRepositoryPort`, `ViolationRepositoryPort`, `SuppressionRepositoryPort`
  - `NotificationPort`, `ProgressReporterPort`
- **Acceptance:**
  - Each port has a complete TSDoc comment explaining its contract
  - In-memory fake implementation exists in `packages/testing/src/mocks/`
- **Effort:** M

### [P1-03] AST abstraction layer

- **Deps:** P1-02
- **Outputs:** `packages/ast/`
  - Tree-sitter wrapper exposing a unified `ASTNode` type across languages
  - Visitor API (`visit(node, { enter, exit })`)
  - Query helpers for tree-sitter S-expression queries
  - Initial support: TypeScript, JavaScript, Python
- **Acceptance:**
  - Parsing a 1000-line TS file completes in <100ms on M2 — asserted by an executable benchmark committed with the package, not a doc-only number (maintainer-approved 2026-07-07)
  - Visitor pattern correctly traverses arbitrary subtrees
  - Contract tests verify the wrapper conforms to `AstParserPort`
- **Effort:** L

### [P1-04] Rule engine

- **Deps:** P1-02, P1-03
- **Outputs:** `packages/rule-engine/`
  - `Engine` class: registers rules, walks AST once per file, dispatches to rules registered for each node type
  - `RuleContext`: read-only view exposed to rules (file path, layer, config snapshot)
  - `Runner`: orchestrates per-file rule execution and aggregates violations
- **Acceptance:**
  - A no-op file of 1000 nodes with 50 registered rules runs in <50ms — asserted by an executable benchmark with a committed baseline (maintainer-approved 2026-07-07)
  - Rules cannot mutate the AST or context (TypeScript readonly + frozen objects)
  - Adding a new rule requires zero changes to the engine
- **Effort:** L

### [P1-05] Config system

- **Deps:** P1-01
- **Outputs:** `packages/config/`
  - Zod schemas for `reviewtool.yaml`
  - cosmiconfig integration for discovery
  - Hierarchical merging (org → team → repo → path)
  - Validation errors that include file path and YAML line numbers
- **Acceptance:**
  - Loading a valid config returns a typed object
  - Loading an invalid config produces a human-readable error pointing to the exact line
  - Inheritance from `extends:` chains works (like ESLint's `extends`)
- **Effort:** M

### [P1-06] Domain services

- **Deps:** P1-01
- **Outputs:** `packages/core/src/services/`
  - `LayerClassifier`: pure function `(filePath, manifest) → Layer | null`
  - `ConformanceScorer`: calculates per-layer compliance percentage
  - `SuppressionEvaluator`: determines if a violation is suppressed
- **Acceptance:**
  - All services are pure functions (referentially transparent)
  - Property-based tests verify edge cases (overlapping patterns, expired suppressions)
- **Effort:** M

---

## Phase 1 Exit Criteria

- [ ] Domain model complete and frozen (no churn expected in P2+)
- [ ] Rule engine handles 100 fixture rules across 10 fixture files without errors
- [ ] All ports have in-memory fakes in `packages/testing`
- [ ] Phase handover written with domain language glossary, rule-authoring guide, and gotchas in tree-sitter version pinning

---

## Phase-Specific Notes

- **Branded types in TypeScript:** use the `Tagged` pattern from `type-fest` or hand-rolled `type RuleId = string & { __brand: 'RuleId' }`. Pick one and be consistent.
- **Tree-sitter grammar versions** drift. Pin every grammar in `package.json`. Add a smoke test that parses a sample file per language; it'll catch breaking changes on dependency updates.
- **`exactOptionalPropertyTypes`** changes how optional properties are typed. Some libraries don't play well with it. Document any exceptions you make.
- **Domain services must be pure.** No `Date.now()`, no `Math.random()`, no file I/O. Take time/randomness/IO as injected dependencies.
- **The rule engine is the hottest code path.** Benchmark from day one. A microbenchmark in `packages/rule-engine/tests/perf/` is part of the deliverable — and it runs in CI against a committed baseline (maintainer-approved 2026-07-07: a perf criterion that isn't executable is an aspiration, not a gate). Gate on gross regressions only, with generous headroom for shared-runner noise; the precise M2 numbers are asserted locally.

---

## Definition of Done for Phase 1

The next agent should be able to:

1. Import any domain type from `@argus/core` and use it with full type safety
2. Implement a new rule against the rule engine and have it dispatched correctly
3. Load a YAML config and get back a typed object or a useful error
4. Start Phase 2 (writing actual rules) with no further core changes
