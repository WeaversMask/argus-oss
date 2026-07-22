# ADR-0004 — Domain Model Boundary Semantics (D-2/D-3/D-4)

**Status:** Accepted
**Date:** 2026-07-06
**Decision makers:** Maintainer (rulings given in session, 2026-07-06; raised as Open Decisions D-2/D-3/D-4 by the P1-01 independent review, 2026-07-05)

---

## Context

The P1-01 review of `@argus/core` surfaced three model-level ambiguities that gate P1-02 (port signatures) and P1-03 (tree-sitter adapter):

- **D-2:** Composite factories (`violation`, `finding`, `scanResult`, `layerManifest`) trusted embedded components structurally — an unvalidated inline `Position` literal compiled, passed, and escaped `Object.freeze`. The imminent risk is P1-03: tree-sitter coordinates are 0-based, ours are 1-based, and a hastily mapped literal would flow straight into the domain.
- **D-3:** `Position`'s TSDoc claimed columns are _inclusive_ **and** that `start == end` is zero-width — mutually exclusive statements. Every adapter (tree-sitter, LSP, SARIF export) converts against this sentence.
- **D-4:** `Suppression` carries no project association; suppressions are authored in each project's own config file (`argus.yaml`, P1-05 — named `reviewtool.yaml` when this ADR was accepted; renamed under D-7, 2026-07-19).

## Decision

1. **D-2 → (a) re-validate + deep-freeze.** Composite factories re-run each structural component through its own factory, merge the component's issues under a prefixed path (e.g. `violations[1].position.startLine`), and embed the factory's frozen copy. Branding composites (option b) was rejected: entity construction is not the hot path, and structural inputs keep adapters and tests ergonomic. The principle extends to `completeScan`, which rebuilds its embedded `ScanResult` through the factory (also re-deriving `countsBySeverity`); its error union widens to `ScanTransitionError | ValidationError`. Branded primitives (`RuleId`, `FilePath`, …) remain the compile-time tier; composites get the runtime tier.
2. **D-3 → (a) 1-based, end-exclusive.** A `Position` spans from the start point up to but **not** including the end point, matching LSP, SARIF, and tree-sitter conventions: `start == end` is a zero-width point, same-line width is `endColumn - startColumn`, and conversion from 0-based end-exclusive sources is a uniform `+1` on all four numbers. The runtime validator already permitted `start == end`; only the TSDoc changed.
3. **D-4 → (a) no `projectId` on `Suppression`.** The project link is contextual, not intrinsic — it derives from which config file a suppression was loaded from. `SuppressionRepositoryPort` (P1-02) takes a `ProjectId` query parameter instead. Adding a field later is additive and cheap; removing one is breaking, and an intrinsic `projectId` would also foreclose broader scopes (org-level or monorepo-shared suppressions).

## Consequences

### Positive

- The 0-based literal bypass is closed at every composite construction site, with aggregated, path-prefixed errors; nested components are frozen copies, restoring the deep-immutability guarantee.
- Position semantics are unambiguous before any adapter exists; all planned integrations convert with a uniform shift and SARIF export is pass-through on column semantics.
- Port signatures in P1-02 can freeze with suppression scoping settled.

### Negative

- Composite construction re-validates already-validated components (harmless double work; construction is not the hot path — rule dispatch is).
- Re-validation only catches _out-of-range_ values. An in-range off-by-one (0-based row `5` mapped without `+1` → line 5 instead of 6) is structurally valid and passes; **P1-03 must ship conversion contract tests** asserting the `+1` mapping.
- `completeScan` callers now handle a `ValidationError` case in the error union (precedent: `failScan` already has this shape).

## Related

- Raised by the P1-01 review ([argus-oss#10](https://github.com/WeaversMask/argus-oss/pull/10)); implemented in the P1-01a follow-up PR.
- D-1 (Turbo remote cache) remains open — unrelated to the domain model.
