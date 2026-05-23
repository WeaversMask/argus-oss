# Engineering Principles

> **Always loaded.** These are non-negotiable. Every task, every PR, every agent execution is held against them.

## Architectural Principles

- **Hexagonal / Ports & Adapters.** Domain logic depends on interfaces (ports). External tools, databases, and frameworks live behind adapters. The `core` package never imports from `apps/*`, `adapters/*`, or `persistence/*`.
- **Dependency rule.** Imports flow inward only: `apps → orchestration → domain ← adapters`. Never the reverse. This is enforced by the platform on itself (dogfooding).
- **Domain-Driven Design.** Domain language is consistent across code, tests, docs, and UI labels. Ubiquitous terms: `Scan`, `Violation`, `Rule`, `Layer`, `LayerManifest`, `Finding`, `Project`, `Suppression`.
- **No God objects.** No class or module exceeds 300 lines without explicit justification in the PR description. Files are split by responsibility, not by file-type.
- **Composition over inheritance.** Strategy and decorator patterns preferred. Inheritance only for true `is-a` relationships.

## Code Quality Principles

- **Strict TypeScript everywhere.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any` without an inline disable comment explaining why.
- **Pure functions by default.** Side effects pushed to the edges of the system (adapters, entry points).
- **Errors are values where possible.** Use `Result<T, E>` types (`neverthrow` library) for expected failures; throw only for true exceptions.
- **No primitive obsession.** Wrap meaningful primitives in branded types or value objects (`FilePath`, `LayerName`, `RuleId`).
- **Immutability.** All data structures are `readonly` unless explicitly stated. Use `Object.freeze()` defensively in factories.

## Testing Principles

- **Test pyramid.** ~70% unit, ~20% integration, ~10% end-to-end.
- **TDD for rule logic.** Every rule has `valid/` and `invalid/` fixture folders; tests run all fixtures against the rule before any implementation lands.
- **Contract tests for adapters.** Every adapter has a contract test verifying it conforms to its port interface. Switching `jscpd` for another clone detector should require zero changes to the rest of the system if the new adapter passes the contract tests.
- **No mocking of own code.** Mock only at the edges (HTTP, file system, subprocess). Internal collaborators use real implementations or in-memory fakes.
- **Property-based testing** (`fast-check`) for graph operations, config merging, and metric calculations.

## Process Principles

- **Trunk-based development.** Short-lived feature branches; PRs merged daily.
- **Conventional commits.** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. Enforced by commit-msg hook.
- **Every PR has tests.** Coverage cannot drop. New code reaches ≥85% line, ≥80% branch.
- **Documentation is part of done.** A feature isn't shipped until `IMPLEMENTATION.md` is updated and (if cross-cutting) an ADR is written.
- **No silent suppression.** Every suppressed warning, ignored rule, or `@ts-expect-error` requires a justification comment.

## Definition of Done

A task is done when:
- [ ] All acceptance criteria in the phase task definition are met
- [ ] Tests added and passing locally
- [ ] Lint and type-check clean
- [ ] Coverage threshold met
- [ ] Dogfood scan shows no new issues (once Phase 2 ships)
- [ ] `IMPLEMENTATION.md` updated
- [ ] `HANDOVER.md` rewritten for the next picker
- [ ] PR opened and merged
