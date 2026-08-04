# Handover — OPS-07 complete (the build gate never checked anything)

**From:** claude-opus-5
**To:** next picker (Phase 2 — **OPS-05 is still the only numbered task left**, then the phase transition)
**Date:** 2026-08-04
**Phase:** P2 — MVP (6/6 numbered · 8/9 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** OPS-07 — retire the vacuous build gate, guard the survivors. PR open, awaiting merge.

---

## Context

`pnpm build` was listed as a mandatory sign-off gate in [CLAUDE.md](../CLAUDE.md), asserted green in nearly every handover in [`handovers/`](./handovers/), and ran as its own CI job — while `turbo run build` executed **zero tasks** for the entire life of the project. No workspace package has ever declared a `build` script, and turbo reports `0 successful, 0 total` as a **success**. Every one of those green claims was vacuous. Surfaced by the [OPS-05](https://github.com/WeaversMask/argus-oss/pull/51) independent review.

**The claim was withdrawn, not the mechanism deleted** — and that distinction is the maintainer's ruling on this task, after a first pass that deleted the CI job too (Gotcha 1). Making the gate real means giving `@argus/core` a build step, which is exactly the restructure **D-5 defers**; `pnpm typecheck` already runs `tsc --noEmit` across all 10 packages, so the compile verification was never missing, only mislabelled. `pnpm build` and its CI job stay put, no longer cited as sign-off evidence, ready for D-8's bundle. The gate list is now `pnpm lint && pnpm typecheck && pnpm test && pnpm gates:check`.

---

## What I Did

- **Removed `pnpm build` from every live sign-off gate list** — [CLAUDE.md](../CLAUDE.md), [agentic-execution.md](./plan/protocols/agentic-execution.md), [workflow.md](./workflow.md), [README.md](../README.md), and the three `dev/adding-a-*.md` recipes — each now saying plainly that it runs zero tasks and why it is kept anyway. The root `build` script and the CI `Build` job are **unchanged from `main`**.
- **Added [`check-gate-coverage.mjs`](../scripts/check-gate-coverage.mjs)** (`pnpm gates:check`, a step in the CI `lint` job) — three fail-closed assertions so the gates that _are_ claimed cannot rot the same way: every package declares `typecheck` **and it really runs `tsc --noEmit`**, every package appears in vitest's `projects`, and no package declares `build` — the last a **tripwire, not a prohibition**, firing the day D-5 stops holding so the gate list is updated rather than left stale.
- **Registered it** in [quality-gates.md](./plan/protocols/quality-gates.md), and annotated the type-check row as the compile verification.
- **Corrected [workflow.md](./workflow.md)'s job census**, stale twice over: it said "three of eleven report without blocking" when DOC-05's `docs-delta` job had landed a day later and was never counted. Now four of twelve — with the note that `Build`, one of the eight that block, blocks on nothing.

PRs open in this session:

- #52 — fix(ci,docs): retire the vacuous build gate, guard the survivors (OPS-07)

---

## What I Did NOT Do (Deferred)

- **Did not touch archived handovers or [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md).** Nine snapshots and Phase 0's spec list `pnpm build` as a green gate. The protocol says snapshots are history, not live documents — editing them would rewrite the past into something that was never true, and the claim really was made. Only live instructions were corrected. **If the maintainer wants the archive annotated instead, that is a ruling, not an oversight.**
- **Did not touch `turbo.json`.** The `build` task definition and the `^build` edges on `test`/`typecheck` are inert with no package declaring a build, and they are the plumbing that makes a future build a normal turbo edge — which is D-5's whole plan. Removing them would only have to be undone by D-5 or D-8.
- **Did not change branch protection, and no longer needs to.** The first pass deleted the CI `Build` job, which would have required an admin-only edit to the required-checks set and blocked every PR until it happened; the maintainer ruled that excessive and the deletion was reverted. See Gotcha 1.
- **Did not write automated tests for `gates:check`, and this is the one piece of debt OPS-07 adds.** Its 14 negative cases were each run by breaking the tree and requiring failure — but by hand, in a shell one-liner, not in the repo and not in CI. **Two independent reviews found a fail-open in this script, and every fix was verified once, manually, by the person who wrote it.** Nothing prevents a third. The blocker is that `scripts/` has no test harness at all (`check-licenses.mjs`, `generate-third-party-notices.mjs` and `rotate-handover.mjs` are equally untested, so this is a pre-existing gap OPS-07 widens rather than creates). **Filed rather than done, on the maintainer's explicit ship decision (2026-08-04)** — the fix is a vitest project over `scripts/` seeded with the 14 cases, and it is worth more than a third review pass, because a review catches one bug once whereas the tests catch regressions forever.
- **Still inherited, still each needing their own task:** the missing `FormatterPort` fake (10 fakes for 11 ports), the weekly Stryker job red since 2026-07-28, `argus explain` not reporting fixability, `ci.yml`'s stale `license` job comment, and `review-gate`'s frozen-PR-body trap.

---

## Gotchas & Surprises

1. **Deleting a CI job whose name is a required status check blocks every PR in the repo — and I did it before the maintainer pulled it back.** `Build` is one of `main`'s eight required checks (`strict: true`, each pinned to `app_id: 15368`). GitHub does not notice a required check's job is gone; it waits indefinitely at "Expected — waiting for status to be reported". All 12 jobs passed and the PR still reported `mergeStateStatus: BLOCKED`. **The maintainer's ruling (2026-08-04) is the lesson: the finding was a false _claim_, and a claim is fixed by editing documents.** Deleting the mechanism was a different, more expensive change — an admin-only round-trip to remove a job that **D-8's bundle makes real within weeks**, at which point both the job and its required-check entry would have to come back. The command, the root script and the CI job all stay; only the sign-off claim is withdrawn. `ci.yml`'s header did keep one fix from the attempt — it warned only against _renaming_ a branch-protection-coupled job, and now warns against deleting one too.

2. **The rot was documented at P0-05 and closed with a prediction that never came true.** [`p0-05-ci-pipeline-handover.md`](./handovers/p0-05-ci-pipeline-handover.md) recorded the empty-run warning, told the next agent not to add a stub `build` script to silence it, and said the warning would "disappear naturally" once real packages shipped. The packages shipped. D-5 then ruled the workspace stays source-only, which made the prediction permanently false — and nobody went back. **A known-benign warning with an expiry condition needs a mechanism, not a note**, because the note is read once and the condition is checked never.
3. **`packages/*` is the wrong glob in this repo and it fails silently.** My first enumeration of the workspace — a shell loop over `packages/*/package.json` — quietly skipped `@argus/adapters-prettier`, which lives at `packages/adapters/prettier`. That is the same blind spot DOC-05's review found in the docs-delta gate's `SOURCE_RE`, hit again within minutes of starting. `gates:check` therefore asks `pnpm list` rather than globbing, and the **first** negative test breaks the nested adapter specifically.
4. **A gate that reaches nothing reports success, and this is a whole class, not one bug.** `turbo run <task>` exits 0 when no package declares the task; `pnpm test` passes when a package is missing from vitest's hand-maintained `projects` array (whose own comment asks you to remember). Both are one careless PR away. That is why the replacement is a guard over the fan-out rather than just a deletion — the same reasoning as DOGFOOD's `filesScanned > 100` floor and OPS-06's fail-closed marker.
5. **The negative tests are run by breaking the tree and requiring failure**, then restoring — eight of them now. P2-05's lesson (a regression test that cannot fire passes while proving nothing) applies directly to guard scripts.
6. **The independent review found the anti-vacuity guard passing vacuously, which is the whole lesson of this task repeating itself one level up.** `vitestProjects()` matched quoted strings over the raw `projects` block, so a **commented-out** entry — `// "packages/core/vitest.config.ts",`, exactly how anyone disables a flaky suite — read as live. `@argus/core`'s tests would not run, `pnpm test` would pass, aggregate coverage thresholds are computed over surviving projects so they would not catch it either, and `gates:check` would report all ten packages covered. Reproduced, then fixed by stripping comments before matching. **My own four negative tests missed it because they all deleted lines rather than commenting them** — I tested the edit I would make, not the edit a person under time pressure makes. The reviewer also closed the mirror-image loophole: a **stub** `"typecheck": "true"` satisfied a presence check while compiling nothing, which is the precise dodge P0-05's handover warned against, so the guard now asserts the script actually runs `tsc --noEmit`.

7. **A SECOND review of the first review's fix found the same class of bug again — twice — and that repetition is the finding.** The maintainer asked for a narrow pass over the fix commit alone, on the grounds that its ~75 lines of new regex parsing had been read by nobody but its author. It returned REQUEST CHANGES with two reproduced **fail-opens**, both in `gates:check` itself:
   - **`projects` scraping credited any quoted path, live or not.** Stripping comments closed one instance and not the class: `...(process.env.RUN_CORE ? ["packages/core/vitest.config.ts"] : [])` — an ordinary vitest pattern — still scraped as live. Reproduced end to end: **nine** real projects, `@argus/core` absent, guard exits 0 reporting all ten covered.
   - **`declared.includes("tsc --noEmit")` was satisfied by `tsc --noEmit || true`**, which makes `pnpm typecheck` **print a type error and exit 0**. Reproduced against the real gate with a planted error. Not adversarial — `|| true` is how anyone silences a noisy package mid-refactor.

   The fix is the one worth carrying: **`vitestProjects` no longer guesses.** Anything that is not a plain list of string literals — spread, ternary, variable, inline object — is an error, not something to squint at. The script asserted over _text that resembled_ the thing rather than the thing itself, which is how it could keep re-acquiring the exact bug it exists to catch. Script assertions are equality now, not containment.

---

## State of the System

- ✅ Tests: **806 passing** (74 files), 0 failing
- ✅ Coverage: 97.91% line / 93.92% branch / 99.79% function / 97.98% statement
- ✅ Root gates green: `lint`, `typecheck`, `test`, `gates:check`, plus `format:check`, `boundaries` (256 modules, 902 deps, 0 violations)
- ✅ `gates:check` negative tests: **14**, every one run by breaking the tree and requiring failure, then restoring
- ✅ Dogfooding scan of self: **0 violations, 0 failures, 161 files**
- ✅ CI: all **12** jobs green on the branch; no branch-protection change needed

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
.github/workflows/ci.yml                          [modified — comments only]
package.json                                      [unchanged]
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

All gates green and the self-scan is clean; the tree is in a working state and the next agent can start immediately. **No admin step and no merge blocker** — the scope was narrowed on the maintainer's ruling so the CI `Build` job stays exactly where it was.

— claude-opus-5
