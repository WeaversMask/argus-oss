# Quality Gates

> **Load on demand** before opening a PR or transitioning a phase.

## Per-PR Gates (Enforced by CI)

- ✅ Lint passes
- ✅ Type check passes (`tsc --noEmit`)
- ✅ All tests pass
- ✅ Coverage ≥85% line / ≥80% branch on changed files
- ✅ No new high/critical security findings (Argus self-scan, from Phase 2 onwards)
- ✅ Bundle size deltas within budget (web app)
- ✅ Conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
- ✅ Linked task ID in PR description
- ✅ `IMPLEMENTATION.md` updated
- ✅ `HANDOVER.md` updated

## Per-Phase Gates (Enforced by Phase Exit Review)

- ✅ All phase tasks complete and merged to main
- ✅ Phase exit criteria (listed in the phase file) verified
- ✅ Demo recorded (if applicable per phase)
- ✅ Phase handover archived to `docs/handovers/`
- ✅ ADRs written for any architectural decisions made during the phase
- ✅ Risk register reviewed; new risks added, mitigated risks closed
- ✅ Metrics snapshot recorded in `IMPLEMENTATION.md`

## Pre-Release Gates (1.0 GA)

- ✅ Performance targets met (see Phase 11 doc for specifics)
- ✅ Security audit complete with no high/critical findings open
- ✅ Documentation site live with rule reference for all built-in rules
- ✅ Migration guides published (from SonarQube, ESLint-only, ArchUnit)
- ✅ Beta program feedback addressed and documented
- ✅ Backwards compatibility policy documented
- ✅ Public APIs frozen (any breaking change requires a major version)

## Coverage Exceptions

The following may be excluded from coverage requirements:

- Generated code (e.g. tRPC type definitions)
- Pure type-only files (`.d.ts`, files with only `export type` and `export interface`)
- `index.ts` re-export barrels with no logic
- Test fixture files

All exclusions must be listed explicitly in the package's `vitest.config.ts` with a comment justifying each.

## Dogfooding Gate (from Phase 2 onwards)

Once Argus can scan TypeScript, every CI run scans the Argus codebase with itself:

- New violations introduced by a PR **block** the merge
- Existing violations are tracked as a ratchet — count cannot increase
- Architecture violations (Phase 3 onwards) block immediately — no ratchet

This is the strictest possible test: the tool's own quality bar applied to itself.
