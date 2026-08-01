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
- ✅ License policy respected ([ADR-0002](../../adr/0002-third-party-integration-and-licensing-policy.md)): dependency changes stay on the SPDX allowlist (or are a documented named exception), nothing vendored, `THIRD-PARTY-NOTICES` regenerated (`pnpm notices`) when the tree changes. Both halves are automated in the `license` job — the allowlist by `pnpm license-check` (P0-12), notice freshness by `pnpm notices:check` (OPS-06, which until then was an unenforced convention several task rows had already claimed as verified)
- ✅ Independent review pass evidenced on the PR — the `Independent review pass` CI job (OPS-04) fails any non-draft PR lacking an `## Independent review` block in the description (light tier) or an `## Independent review packet` comment (full tier); brief in [agentic-execution.md](./agentic-execution.md) §Task Completion Checklist. (Job ships with OPS-04a; adding it to the branch-protection required-checks set is a pending admin step.)
- ✅ Linked task ID in PR description
- ✅ `IMPLEMENTATION.md` updated
- ✅ `HANDOVER.md` updated
- ✅ Open Decisions in `IMPLEMENTATION.md` reviewed by the maintainer — answered or consciously re-dated before merge

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
- **Process entry points** — a file whose only job is to read `process.argv`/env, hand off to tested logic, and set an exit code — **provided it contains no branching of its own and is exercised end-to-end by tests that spawn the real executable.** Unlike the four above, this is not a "nothing to test" case: the code does run, and it matters. Instrumented coverage simply cannot cross a process boundary, so the subprocess test is **substitute evidence, not a waiver** — without it the exclusion is invalid. (Added 2026-07-25 for `apps/cli/src/cli.ts`; the P2-02 independent review flagged that the exclusion matched no listed category, and the standard was extended rather than the exclusion quietly kept.)

All exclusions must be listed explicitly in the package's `vitest.config.ts` with a comment justifying each.

## Dogfooding Gate (from Phase 2 onwards)

Once Argus can scan TypeScript, every CI run scans the Argus codebase with itself:

- New violations introduced by a PR **block** the merge
- Existing violations are tracked as a ratchet — count cannot increase
- Architecture violations (Phase 3 onwards) block immediately — no ratchet

This is the strictest possible test: the tool's own quality bar applied to itself.

**Current implementation (dogfooding-wiring task):** the `dogfood` CI job runs
`argus check .` (repo-root `argus.yaml` excludes test files/fixtures) and
requires **zero violations, zero failures** — a ratchet at count 0 satisfies
the property above trivially, so no separate baseline-tracking mechanism
exists yet. A nonzero ratchet (compare PR count against `main`'s) is a later
task if the zero bar is ever knowingly relaxed. Not yet a branch-protection
required check (maintainer admin step, same bucket as `boundaries`/`license`).
