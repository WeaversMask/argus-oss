# Quality Gates

> **Load on demand** before opening a PR or transitioning a phase.

## Per-PR Gates (Enforced by CI)

- ✅ Lint passes
- ✅ Type check passes (`tsc --noEmit`) — **this is the compile verification.** The workspace is buildless by ruling ([`../../IMPLEMENTATION.md`](../../IMPLEMENTATION.md) D-5: every package's `exports` point at `src/`), so nothing emits artifacts and `turbo run typecheck` across all 10 packages is what proves the code compiles. There is deliberately **no build gate** — see the gate-coverage row below
- ✅ All tests pass
- ✅ The root gates still cover every workspace package — `pnpm gates:check`, a step in the `lint` job (OPS-07). The root gates fan out (`turbo run typecheck` to packages declaring the script, `pnpm test` to packages listed in vitest's `projects`) and **both report success when they reach nothing**. That is not hypothetical: `pnpm build` was listed as a mandatory sign-off gate in [`../../../CLAUDE.md`](../../../CLAUDE.md) and asserted green in nearly every handover while `turbo run build` ran **zero tasks**, for the entire life of the project — no package has ever declared a `build` script. P0-05's handover recorded the empty-run warning and predicted it would resolve itself once real packages shipped; they shipped, D-5 ruled the workspace stays source-only, and nobody re-checked. **The claim was withdrawn rather than the gate made real** — making it real means the restructure D-5 defers — but the `pnpm build` command and its CI job are kept, because D-8's bundle makes them real soon and deleting a job whose name is a branch-protection required check imposes an admin round-trip for nothing. This check guards the gates that _are_ claimed: it fails when a package declares no `typecheck` script (or stubs it), when a package is missing from vitest's `projects`, or when any package gains a `build` script — the last being a tripwire, not a prohibition, signalling that D-5 no longer holds and `pnpm build` belongs back in the sign-off list. Packages are enumerated via `pnpm list`, never a glob: `packages/adapters/prettier` is nested a level deeper than `packages/*` and a single-segment pattern omits it silently (the same blind spot DOC-05's review found in `SOURCE_RE`)
- ✅ Coverage ≥85% line / ≥80% branch on changed files
- ✅ No new high/critical security findings (Argus self-scan, from Phase 2 onwards)
- ✅ Bundle size deltas within budget (web app)
- ✅ Conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
- ✅ License policy respected ([ADR-0002](../../adr/0002-third-party-integration-and-licensing-policy.md)): dependency changes stay on the SPDX allowlist (or are a documented named exception), nothing vendored, `THIRD-PARTY-NOTICES` regenerated (`pnpm notices`) when the tree changes. Both halves are automated in the `license` job — the allowlist by `pnpm license-check` (P0-12), notice freshness by `pnpm notices:check` (OPS-06, which until then was an unenforced convention several task rows had already claimed as verified)
- ✅ Independent review pass evidenced on the PR — the `Independent review pass` CI job (OPS-04) fails any non-draft PR lacking an `## Independent review` block in the description (light tier) or an `## Independent review packet` comment (full tier); brief in [agentic-execution.md](./agentic-execution.md) §Task Completion Checklist. (Job ships with OPS-04a; adding it to the branch-protection required-checks set is a pending admin step.)
- ✅ Documentation delta recorded — the `Documentation delta` CI job (DOC-05) fails any non-draft PR that changes source (`packages/*/**/src/**`, `apps/*/src/**`, `scripts/**`) while touching no documentation surface (`docs/**`, any `README.md`, any root-level `*.md`) **and** changing no doc-comment lines in the source it touched. If the change genuinely has none, the job accepts an explicit justification line in the description instead; the exact wording, the definitions, and the TSDoc content-inspection ruling are in [03-documentation.md §Cadence](../03-documentation.md). (Job ships with DOC-05; adding it to the branch-protection required-checks set is a pending admin step — until then it is a visible red X, not a merge blocker.)
- ✅ Archived handover links resolve — `pnpm handover:check`, a step in the `lint` job (DOC-06). Rotation copies `docs/HANDOVER.md` one directory deeper, which invalidates every relative link in it; `pnpm handover:rotate` re-resolves them as it copies, and this step is what makes a hand-rolled `cp` fail loudly. Unenforced, it reached 100 broken links over several months. Inline links only — reference-style definitions and raw HTML anchors are invisible to it
- ✅ [`progress.md`](../../progress.md) entry added — one dated, PR-linked, plain-language paragraph per merged task (DOC-05). Not CI-enforced: it is a checklist item on the PR template, because "is this readable by a stranger" has no oracle
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
