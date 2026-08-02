# ADR-0007 — The `@argus/api-contracts` Boundary: zod Only, Never Core

**Status:** Accepted
**Date:** 2026-07-25 (taken with P2-04, [argus-oss#37](https://github.com/WeaversMask/argus-oss/pull/37)) · recorded 2026-08-02
**Decision makers:** Taken by the implementing agent at P2-04 and merged by the maintainer; the enforcing rule `api-contracts-only-zod` shipped in the same PR, added after that task's independent review observed the constraint was stated in four documents and enforced nowhere. Written up here after the [Phase 2 documentation audit](../audits/phase-02-doc-audit.md) (Finding 3) found a decision with a mechanical guard and no recorded rationale.

---

## Context

P2-04 gave `argus check` a machine-readable output (`--format json`), which meant the shapes Argus emits across a process boundary needed a home. Those shapes are not a CLI concern: Phase 6 (API server) and Phase 7 (web UI) share the same payloads, and Phase 8 (reporting) builds on them. Whatever was chosen at P2-04 would be load-bearing for three later phases.

The people who consume that wire format are the constraint. A CI script parsing `argus check -f json | jq`, an HTTP client, a browser — **none of them has a domain layer, and none of them wants one.** They need to know what a scan report looks like, not what a `Violation` is.

Argus's existing structure ruled out the two obvious homes on its own terms. `packages/core` is pure domain with no infrastructure dependencies, mechanically enforced by `core-only-neverthrow`; `apps/cli` cannot be imported by anything, enforced by `packages-never-import-apps`.

## Decision

**`@argus/api-contracts` depends on zod alone, and deliberately not on `@argus/core`.**

1. The package may import only itself and `zod`. Enforced by the `api-contracts-only-zod` dependency-cruiser rule in [`dependency-cruiser-rules.cjs`](../../dependency-cruiser-rules.cjs), which is a `to.pathNot` allowlist rather than a prohibition on core specifically — anything new that gets imported trips it.
2. It holds **shapes only**: zod schemas and their inferred types. No serialisation, no formatting, no I/O, no logic.
3. **The domain and the contract each own their vocabulary, and the code that maps between them owns the agreement.** Where the two must line up, an explicit test at the mapping site asserts it — not a shared type. Today: `apps/cli/tests/formatters/json.test.ts` asserts in both directions that core's `SEVERITIES` and the contract's `severitySchema` describe the same set.
4. Schemas are **strict**, making them producer-conformance schemas: a producer that invents a field fails its own tests rather than shipping a shape consumers cannot rely on.

### Alternatives rejected

- **Derive the schemas from core's types** (import `Severity`, infer the rest). Tidy, and it would delete the duplication below — but it makes the contract un-adoptable alone, which is the entire reason the package exists. A consumer would have to install the domain model to parse a JSON file.
- **Put the schemas in `@argus/core`.** Requires zod in core, which `core-only-neverthrow` forbids and ADR-0001's layering argues against. It also ships the whole domain to anyone who wants to read output.
- **Leave the shapes in the JSON formatter** (`apps/cli`). Cheapest at P2-04, impossible at Phase 6: `packages-never-import-apps` means the server could not reach them, and the alternative — duplicating them into the server — is the drift this package exists to prevent.

## Consequences

### Positive

- The wire format can be adopted alone. That is the property being bought, and everything below is its price.
- Producer and consumer validate against the same schema, so they cannot silently disagree about the format.
- `@argus/core` stays free of infrastructure dependencies; the hexagon's inward-only flow is preserved — nothing outside needs the domain to read Argus's output.
- The boundary is enforced by a gate, not by prose. Reversing it requires editing a rule, which is visible in review.

### Negative

- **The same concepts exist twice, in two vocabularies, kept in step by hand.** This is the real cost and it is permanent. `positionSchema` re-implements ADR-0004's 1-based, end-exclusive semantics — including allowing a zero-width `start == end` — independently of core's `position` factory, and **nothing asserts the two agree.** Severity is currently the _only_ shared vocabulary with an agreement test.
- **Therefore: every shared vocabulary needs its own agreement test, added when it is introduced.** Phases 6–8 widen the payload considerably. A shape duplicated without an assertion at its mapping site is not a boundary, it is a latent drift — and it will present as a consumer parsing a valid document into wrong values, not as a build failure.
- Strictness pins a _validating_ consumer to the package version it installed: an additive change is breaking until it upgrades. Deliberate — strictness is worth more on the producing side. A consumer that must survive additions checks `contractVersion` and parses permissively instead ([package README](../../packages/api-contracts/README.md) §Maintenance notes).
- Adding a field to a payload means editing two packages and, if it carries a shared vocabulary, adding a test in a third.

## Related

- [ADR-0004](./0004-domain-model-boundary-semantics.md) — the position semantics `positionSchema` mirrors.
- [`packages/api-contracts/README.md`](../../packages/api-contracts/README.md) — the public surface, versioning policy, and the two invariants the schema cannot express.
- D-8 (CLI/package publishing) remains an open decision in [`IMPLEMENTATION.md`](../IMPLEMENTATION.md); this package is private and unpublished today, which is why "adoptable alone" is currently a property of the source tree rather than of a registry artifact.
- P2-04's independent review is the reason the rule exists at all. Its lesson, recorded in that task's handover: _a rule that lives only in prose is not a rule._ This ADR is the converse case — a rule that lived only in code.
