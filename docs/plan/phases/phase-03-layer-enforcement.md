# Phase 3 — Layer Enforcement & Architecture Analysis

> **Self-contained phase doc.** When done, set Current Phase to P4 and load [`phase-04-tool-adapters.md`](./phase-04-tool-adapters.md).
> ⭐ **The differentiating feature** of the platform.

**Duration:** ~3 weeks
**Demoable:** ✅ Architect demo — ship a fixture project with deliberate architecture violations; tool catches every one.
**Prerequisites:** Phase 2 complete

---

## Goal

Architectural conformance checking — the platform's differentiating capability. Layer manifests in YAML drive enforcement of dependency direction, type contracts, dependency inversion, and exchangeability.

---

## Required Reading Before Starting

- [`../00-principles.md`](../00-principles.md) §1 — note hexagonal principles, which this phase enforces in user code
- The Phase 1 handover, which has the domain types for `Layer`, `LayerManifest`, `LayerBoundary`

---

## Tasks

### [P3-01] Layer manifest schema and loader

- **Deps:** P2 complete
- **Outputs:** `packages/layer-enforcer/src/manifest-loader.ts`, Zod schema in `packages/config`
- **Acceptance:**
  - Loads `layers:` section of `argus.yaml` (D-7 rename, 2026-07-19)
  - Validates pattern syntax (globs)
  - Detects ambiguous classifications (file matching multiple layers)
- **Effort:** M

### [P3-02] Layer classifier

- **Deps:** P3-01
- **Outputs:** `packages/layer-enforcer/src/classifier.ts`
- **Acceptance:**
  - Returns the correct layer for any file path given a manifest
  - Handles glob, annotation, and namespace-based assignment
  - Resolves precedence rules deterministically
- **Effort:** M

### [P3-03] Dependency graph builder

- **Deps:** P1-03 (AST), P3-02
- **Outputs:** `packages/dependency-graph/`
  - Walks ASTs collecting imports
  - Resolves module paths (via `enhanced-resolve`)
  - Builds a Graphology directed graph with layer annotations on nodes
- **Acceptance:**
  - 100k LoC project produces a complete graph in <30 seconds
  - Handles TypeScript path aliases, `package.json` exports, monorepo workspace refs
- **Effort:** L

### [P3-04] Direction checker

- **Deps:** P3-03
- **Outputs:** `packages/layer-enforcer/src/direction-checker.ts`
- **Acceptance:**
  - Detects every illegal cross-layer import in fixture projects
  - Detects cycles
  - Produces violations with both source and target file/layer context
- **Effort:** M

### [P3-05] Type contract checker

- **Deps:** P3-03
- **Outputs:** `packages/layer-enforcer/src/type-contract-checker.ts`
- **Acceptance:**
  - Detects DTO usage in domain functions
  - Detects Entity returns from controllers
  - Configurable allowed/forbidden type lists per layer
- **Effort:** L

### [P3-06] Dependency Inversion checker

- **Deps:** P3-03
- **Outputs:** `packages/layer-enforcer/src/dip-checker.ts`
- **Acceptance:**
  - Verifies interfaces are defined in domain layer
  - Flags concrete infrastructure dependencies in domain code
- **Effort:** M

### [P3-07] Exchangeability checker

- **Deps:** P3-03
- **Outputs:** `packages/layer-enforcer/src/exchangeability-checker.ts`
- **Acceptance:**
  - Flags ORM annotations on domain objects
  - Flags HTTP types leaking into domain/service layers
  - Flags serialization logic in domain models
- **Effort:** L

### [P3-08] Conformance scoring and reporting

- **Deps:** P3-04 through P3-07
- **Outputs:** Per-layer conformance score in scan output
- **Acceptance:**
  - Score is reproducible: same code + same manifest → same score
  - Visible in CLI output and JSON
- **Effort:** S

---

## Phase 3 Exit Criteria

- [ ] Architect demo: fixture project with deliberate architecture violations, tool catches every one
- [ ] Documentation includes "How to define your layer manifest" guide with full examples
- [ ] **Documentation consolidation pass executed and its report committed** under [`../../audits/`](../../audits/) — the per-phase tier of the [documentation cadence](../03-documentation.md), worked against [`../templates/PHASE-DOC-AUDIT.template.md`](../templates/PHASE-DOC-AUDIT.template.md). **This phase cannot be marked ✅ Complete until that report reads ✅ pass** and every finding is fixed or filed
- [ ] Phase handover captures classifier precedence rules and performance considerations for very large graphs

---

## Phase-Specific Notes

- **Classifier precedence is subtle.** A file can match multiple patterns. Pick a clear rule (longest pattern wins? first match wins?) and write an ADR. This decision will outlive you.
- **Graph builder will be invoked from many places later** (CLI, API, LSP). Make it pure and cacheable. Don't bake in any orchestration concerns.
- **Type contract checker needs ts-estree's resolved types.** Tree-sitter alone gives you names; you need full type resolution to know if `User` is a DTO or an Entity. TS-only feature initially.
- **The exchangeability checker is the most opinionated rule set.** Make it heavily configurable. Some projects use ORM annotations on domain types deliberately (Active Record pattern) — don't break those.

---

## Definition of Done for Phase 3

The next agent can:

1. Define a layer manifest for a real project and have it correctly classify every file
2. See architecture violations in the same output as code-quality violations
3. Get a conformance score per layer
4. Start Phase 4 confident the analysis layer is feature-complete for v1
