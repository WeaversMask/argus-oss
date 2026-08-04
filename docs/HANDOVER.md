# Handover — OPS-07 complete (the build gate never checked anything)

**From:** claude-opus-5
**To:** next picker (Phase 2 — **OPS-05 is still the only numbered task left**, then the phase transition)
**Date:** 2026-08-04
**Phase:** P2 — MVP (6/6 numbered · 8/9 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** OPS-07 — retire the vacuous build gate, guard the survivors. PR open, awaiting merge.

---

## Context

`pnpm build` was listed as a mandatory sign-off gate in [CLAUDE.md](../CLAUDE.md), asserted green in nearly every handover in [`handovers/`](./handovers/), and ran as its own CI job — while `turbo run build` executed **zero tasks** for the entire life of the project. No workspace package has ever declared a `build` script, and turbo reports `0 successful, 0 total` as a **success**. Every one of those green claims was vacuous. Surfaced by the [OPS-05](https://github.com/WeaversMask/argus-oss/pull/51) independent review.

It was removed, not made real. Making it real means giving `@argus/core` a build step, which is exactly the restructure **D-5 defers** — and `pnpm typecheck` already runs `tsc --noEmit` across all 10 packages, so the compile verification was never missing. The gate list is now `pnpm lint && pnpm typecheck && pnpm test && pnpm gates:check`.

---

## What I Did

- **Deleted** the root `build` script, the CI `Build` job, and `pnpm build` from every live gate list: [CLAUDE.md](../CLAUDE.md), [agentic-execution.md](./plan/protocols/agentic-execution.md), [workflow.md](./workflow.md), [README.md](../README.md), and the three `dev/adding-a-*.md` recipes.
- **Added [`check-gate-coverage.mjs`](../scripts/check-gate-coverage.mjs)** (`pnpm gates:check`, a step in the CI `lint` job) — three fail-closed assertions so the surviving gates cannot rot the same way: every package declares `typecheck`, every package appears in vitest's `projects`, **no** package declares `build`.
- **Registered it** in [quality-gates.md](./plan/protocols/quality-gates.md), and annotated the type-check row as the compile verification.
- **Corrected [workflow.md](./workflow.md)'s job census**, stale twice over: it said "three of eleven report without blocking" when DOC-05's `docs-delta` job had landed a day later and was never counted, and it counted `Build` among the ones that block.

PRs open in this session:

- #52 — fix(ci,docs): retire the vacuous build gate, guard the survivors (OPS-07)

---

## What I Did NOT Do (Deferred)

- **Did not touch archived handovers or [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md).** Nine snapshots and Phase 0's spec list `pnpm build` as a green gate. The protocol says snapshots are history, not live documents — editing them would rewrite the past into something that was never true, and the claim really was made. Only live instructions were corrected. **If the maintainer wants the archive annotated instead, that is a ruling, not an oversight.**
- **Did not touch `turbo.json`.** The `build` task definition and the `^build` edges on `test`/`typecheck` are inert with no package declaring a build, and they are the plumbing that makes a future build a normal turbo edge — which is D-5's whole plan. Removing them would only have to be undone by D-5 or D-8.
- **Did not change branch protection.** See Gotcha 1 — it is a maintainer-only admin step and it **blocks this PR**.
- **Still inherited, still each needing their own task:** the missing `FormatterPort` fake (10 fakes for 11 ports), the weekly Stryker job red since 2026-07-28, `argus explain` not reporting fixability, `ci.yml`'s stale `license` job comment, and `review-gate`'s frozen-PR-body trap.

---

## Gotchas & Surprises

1. **`Build` is a required status check on `main`, so deleting the job blocks every PR — including this one.** The required set is `["Lint + format","Typecheck","Test + coverage","Build","Secret scan (gitleaks)","Commit message validation","Dependency audit (pnpm)","License compliance (SPDX allowlist)"]`. GitHub waits indefinitely for a required check whose job no longer exists ("Expected — waiting for status to be reported"); it does not notice the job is gone. **The maintainer must drop `Build` from the required set before merging** — the exact `gh api` command is in the `ci.yml` comment where the job used to be. `ci.yml`'s own header warns that job names are branch-protection-coupled; that warning is written about renames and is just as true for deletions.
2. **The rot was documented at P0-05 and closed with a prediction that never came true.** [`p0-05-ci-pipeline-handover.md`](./handovers/p0-05-ci-pipeline-handover.md) recorded the empty-run warning, told the next agent not to add a stub `build` script to silence it, and said the warning would "disappear naturally" once real packages shipped. The packages shipped. D-5 then ruled the workspace stays source-only, which made the prediction permanently false — and nobody went back. **A known-benign warning with an expiry condition needs a mechanism, not a note**, because the note is read once and the condition is checked never.
3. **`packages/*` is the wrong glob in this repo and it fails silently.** My first enumeration of the workspace — a shell loop over `packages/*/package.json` — quietly skipped `@argus/adapters-prettier`, which lives at `packages/adapters/prettier`. That is the same blind spot DOC-05's review found in the docs-delta gate's `SOURCE_RE`, hit again within minutes of starting. `gates:check` therefore asks `pnpm list` rather than globbing, and the **first** negative test breaks the nested adapter specifically.
4. **A gate that reaches nothing reports success, and this is a whole class, not one bug.** `turbo run <task>` exits 0 when no package declares the task; `pnpm test` passes when a package is missing from vitest's hand-maintained `projects` array (whose own comment asks you to remember). Both are one careless PR away. That is why the replacement is a guard over the fan-out rather than just a deletion — the same reasoning as DOGFOOD's `filesScanned > 100` floor and OPS-06's fail-closed marker.
5. **All four negative tests were run by breaking the tree and requiring failure**, then restoring: the nested adapter gains a `build` script, a package drops `typecheck`, a package leaves vitest's `projects`, and the `projects` array becomes unreadable (must fail closed, not pass empty). P2-05's lesson — a regression test that cannot fire passes while proving nothing — applies directly to guard scripts.

---

## State of the System

- ✅ Tests: **806 passing** (74 files), 0 failing
- ✅ Coverage: 97.91% line / 93.92% branch / 99.79% function / 97.98% statement
- ✅ Root gates green: `lint`, `typecheck`, `test`, `gates:check`, plus `format:check`, `boundaries` (256 modules, 902 deps, 0 violations)
- ✅ Dogfooding scan of self: **0 violations, 0 failures, 161 files**
- ⚠️ CI on this branch will show `Build` as permanently pending until the admin step in Gotcha 1 is done

---

## Recommended Next Steps

Pick up **OPS-05** (its PR [#51](https://github.com/WeaversMask/argus-oss/pull/51) is open and awaiting merge — it is the phase's final task by design), in this order:

1. **Expect conflicts with #51 and rebase whichever merges second.** Both branches touch `IMPLEMENTATION.md`, `HANDOVER.md`, `progress.md`, `README.md`, and both rotate `p2-05-diff-mode-handover.md` into the archive under the same slug. This is the documented parallel-lane case in [agentic-execution.md](./plan/protocols/agentic-execution.md) §Parallel Lanes.
2. Read the OPS-05 spec in [`phase-02-mvp.md`](./plan/phases/phase-02-mvp.md) §OPS-05 — note it carries the correction to [go-public-runbook](./go-public-runbook.md) item 7 (79 of 205 commits, not the account written there).
3. Then the phase transition, which re-runs the documentation consolidation pass.

Estimated effort: **M** for OPS-05.

---

## Open Questions for the Next Agent

- **Should the archived handovers be annotated?** Nine of them assert `build` green. I left them as history. A one-line note at the top of the archive index would preserve the record while stopping a reader from trusting the claim — but it edits snapshots, which the protocol restricts to link repair.
- **Is `typecheck` load-bearing enough alone?** It proves the code type-checks, not that it _runs_ — `bin/argus.mjs` re-execs Node with `--experimental-transform-types`, and type-stripping has syntax constraints `tsc --noEmit` does not model. The test suite covers it in practice today; when D-8's bundle lands, that gap closes properly.

---

## Files Touched This Session

```
scripts/check-gate-coverage.mjs                   [created]
package.json                                      [modified]
.github/workflows/ci.yml                          [modified]
CLAUDE.md                                         [modified]
README.md                                         [modified]
docs/workflow.md                                  [modified]
docs/plan/protocols/quality-gates.md              [modified]
docs/plan/protocols/agentic-execution.md          [modified]
docs/dev/adding-a-language.md                     [modified]
docs/dev/adding-a-report-formatter.md             [modified]
docs/dev/adding-an-adapter.md                     [modified]
docs/IMPLEMENTATION.md                            [modified]
docs/progress.md                                  [modified]
docs/HANDOVER.md                                  [rewritten]
docs/handovers/p2-05-diff-mode-handover.md        [created — rotation]
```

---

## Sign-off

All gates green and the self-scan is clean; the tree is in a working state and the next agent can start immediately — but **this PR cannot merge until `Build` is dropped from the required-checks set** (Gotcha 1), which is a maintainer action.

— claude-opus-5
