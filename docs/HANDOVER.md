# Handover — P2-05 complete (diff mode) · every numbered Phase 2 task done

**From:** claude-opus-5
**To:** next picker (Phase 2 — **OPS-05 is the only task left**, then the phase transition)
**Date:** 2026-08-02
**Phase:** P2 — MVP (6/6 numbered · 7/8 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-05 — diff-only scan mode. PR open, awaiting merge.

---

## Context

`argus check --diff <ref>` scans only what a branch changed and reports only the violations on the lines it changed. It is the last numbered Phase 2 task, it was never a phase exit criterion, and nothing waited on it — which is why it ran after the whole M1 documentation tail.

It also created [`packages/orchestrator/`](../packages/orchestrator/README.md), a package `01-repo-structure.md` has reserved since P0 and Phase 6 expects ("routes call orchestrators").

## What I Did

- **[`@argus/orchestrator`](../packages/orchestrator/README.md)** — `extractChangeSet` (base ref → changed files and lines) and `filterToChangedLines` (violations → the ones that overlap a changed line). Git arrives as an injected `GitRunner`; the package imports no Node builtins, enforced by `orchestrator-no-infrastructure`.
- **`apps/cli`** — `--diff <ref>` on `check`, [`git.ts`](../apps/cli/src/git.ts) (the ~50-line subprocess half), and [`scan-scope.ts`](../apps/cli/src/scan-scope.ts), which narrows discovery to the change set and turns every git failure into an exit code.
- **[ADR-0008](./adr/0008-scan-scope-orchestration.md)** — why git is injected rather than a core port, and the three alternatives rejected.
- Full wiring per the new-package checklist: cruiser rules (both **negative-tested** with probe imports), root `vitest` projects entry, `Dockerfile.dev`, `docker-compose.yml` ×2, package README, [`architecture.md`](./architecture.md) row.
- User-facing: [`guide/cli.md`](./guide/cli.md) §"Only what changed", including the table of what does and does not count.

## What I Did NOT Do (Deferred)

- **`fix --diff`.** `argus fix` still works on the whole path. It shares `planScan`, so the plumbing is one argument away, but "fix only the lines I touched" is a different question from "report only the lines I touched" — a fix's edit span is not the violation's span, and deciding what happens when a safe fix would touch an unchanged line deserves its own thinking.
- **No `--diff` in the CI dogfood job.** It still scans the whole repo, which is right for a gate on a repo that is already clean; diff mode is for consumers with a backlog.
- **`GitRunner` has no contract test.** See Gotcha 4.
- **Still inherited, still each needing their own task:** the missing `FormatterPort` fake (10 fakes for 11 ports), the weekly Stryker job red since 2026-07-28, `argus explain` not reporting fixability, `ci.yml`'s stale `license` job comment, and `review-gate`'s frozen-PR-body trap.

## Gotchas & Surprises

1. **Every interesting decision here has a silent failure mode, and they all fail the same direction — quieter.** A two-dot `git diff main` attributes a colleague's post-branch-point work to you; comparing against `HEAD` puts line numbers out of step with the bytes on disk; untracked files have no diff at all, so the newest code in a change reports nothing; a pure rename produces no hunks, so every violation in it is suppressed. Four separate ways to ship a scan that exits 0 and looks like it worked. The countermeasures are merge base, working tree, `ls-files --others`, and `--no-renames` — and the reason there are tests for each is that no output would have shown the difference.
2. **The path vocabulary is string arithmetic on `git rev-parse --show-prefix`, and it has to be.** The obvious approach — ask git for `--show-toplevel`, compare absolute paths — fails on macOS, where `os.tmpdir()` is `/var/folders/…` to Node and `/private/var/folders/…` to git. Every `--diff` test would have matched zero files and passed as "nothing changed". `--show-prefix` sidesteps it because git computes the answer relative to the cwd it was handed, symlinks and all.
3. **Hunk bodies are stepped over by counting, not by scanning for the next marker.** An added line whose content is `+++ b/other.ts` is indistinguishable from a header once it carries its own `+`. Reading it as one attributes the rest of the diff to the wrong file — a wrong-file suppression that nothing in the output reveals. There is a test that adds exactly that content.
4. **The injection buys the test suite, and that is the actual argument for it.** 48 orchestrator tests cover the diff grammar — omitted hunk counts, `/dev/null` targets, binary files, C-quoted UTF-8 paths, `\ No newline at end of file` — with no repository on disk. Against a real `git`, most of those would have been too expensive to write, which is exactly how the quiet edge cases survive. The cost is recorded in ADR-0008: `GitRunner` is a contract with one implementation and no contract test, unlike a real port.
5. **The dogfood scan caught this task, twice.** `planScan` reached complexity 12 / 69 lines and `diff-extractor.ts` reached 356 lines. Both were split (`resolveContext` + `narrowToChanges`; `change-set.ts` + `unified-diff.ts`), not waived. The `diff-extractor.ts` split turned out to be the better structure anyway — "how to talk to git" and "how to read a unified diff" had no business in one file.
6. **The independent review found three real bugs, and all three were in my own stated defence.** `DIFF_FLAGS` carries a comment saying it exists to stop a user's git _config_ producing output that parses to silently fewer changed lines — and the reviewer found two configs it missed (`diff.interHunkContext`, which reintroduces context despite `--unified=0`; `diff.relative`, which empties the change set whenever the project root sits below the repo root) plus one plain-git behaviour (a **trailing tab** after any path containing a space, which made a change-set key no discovered file could match). The last needs no unusual config at all — `git add 'has space.ts'` was enough. All three reproduce on git 2.49; all three are now flagged, stripped, or backstopped, with a test each. **Probing the fix then turned up a fourth, of my own making:** once `skipHunkBody`'s new backstop re-synchronises mid-body, the remaining body lines _are_ walked line by line, so a file adding a line that reads `+++ b/…` — a patch file — could rename the current target and swallow its own later hunks. Reproduced (a second hunk landed on `evil.ts`), then closed by requiring the `---` partner git always emits alongside a real header. The two hardenings are one mechanism; neither is safe alone. **The lesson is narrower than "test more":** every one of them is invisible from this repo's own layout — no spaces in paths, project root == repo root, default git config — so no amount of dogfooding here would have surfaced them. A parser fed by a tool you do not control needs its inputs probed against that tool, not against your repo.
7. **A second review pass found that my fix to the first review's findings was itself incomplete — twice over.** The `---`/`+++` pairing I added is necessary but **not sufficient**: content forges the pair, because a removed line `-- x` renders as `--- x` and an added `++ b/evil.ts` right after it as `+++ b/evil.ts`. My own regression test for that fix used `-old` as the preceding line, a shape that _cannot_ fire — so it passed while proving nothing. Worse, the reviewer found `diff.submodule=diff` reaches the same desynced walk through **plain config, no environment variable**, which is exactly the class `DIFF_FLAGS` claims to defend against. Both reproduced. The real fix is structural: `parseDiff` now refuses to re-target for anything but a `diff --git ` line while desynced — a marker content can never impersonate, since every body line carries its own `+`, `-` or `\`. A desync can now only over-report.
8. **My first attempt at the end-to-end test passed without testing anything, twice.** First it set `GIT_DIFF_OPTS` through `captureIO`'s `env` — but `gitRunner` gives the child no explicit env, so it inherits `process.env` and the injected value never reached git. Then, with that fixed, the fixture wrote the forged line as a comment (`// -- old signature`), which renders as `-// -- …` and forges nothing. **The habit worth keeping is the one that caught both: disable the fix, and require the test to fail.** It passed green through both broken versions.
9. **`pnpm handover:rotate <slug>` takes the slug of the handover **going out**, not the task coming in.** I filed DOC-06's handover as `p2-05-diff-mode-handover.md` on the first run, which is wrong and which the script cannot detect — it is a `cp` with link rewriting, and the name is whatever you type. Nothing validates it against the file's own `# Handover — <task>` heading, which is right there in line 1. Small, cheap gate if anyone wants it.

## State of the System

- ✅ Root gates green: `lint`, `typecheck`, `build`, `test` (**74 files, 806 tests** — up 69 from 737), `boundaries` (262 modules, 902 deps, 0 violations)
- ✅ Both new cruiser rules negative-tested — probe imports tripped `orchestrator-public-entry-only` and `orchestrator-no-infrastructure`, then were removed and the clean run re-verified
- ✅ Self-scan clean: 160 files, 0 violations, 0 failures, exit 0 — and `check . --diff main` on this branch selected **13** files, matching git's own count of non-test source files it touched
- ✅ Coverage: orchestrator + `scan-scope.ts` 100% lines (94.3–100% branches); repo totals 97.9% lines / 94.0% branches
- ⚠️ Weekly Stryker still red since 2026-07-28 — report-only; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`)
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **OPS-05 — go-public readiness sweep**, effort S. The last M1 task, and now the last task in the phase. It inherits one correction rather than a question: [runbook](./go-public-runbook.md) item 7 misdescribes how the maintainer's real name reaches history. Measured: **79 of 205 commits** — 52 web-UI merges (name in _author_) plus 27 rewritten by a web-UI "Update branch"/"Rebase and merge" (name in _committer_, invisible without `%cn`). **Zero** locally-made commits are affected, and the paranoia check passes clean. The name is public on the GitHub profile by choice, so "optional, cosmetic" stands — fix item 7's wording only.
2. **Then the phase transition**, which re-runs the consolidation pass. Phase 2's report was written mid-phase and says so; P2-05 and OPS-05 add surface it never saw. Start with §6's link check and §1's counts — both cheap, both mechanical, and between them they caught most of what the first pass found. Note the package count in [`architecture.md`](./architecture.md) moved to **nine**.

## Open Questions for the Next Agent

- **Should `fix` learn `--diff`?** See Deferred — the plumbing is trivial, the semantics are not.
- **Should the link check widen from the archive to all of `docs/`?** Still open from DOC-06. The archive half is gated per PR; the rest of `docs/` is checked only at phase boundaries, and DOC-05's audit found its one live break there.
- **Should `handover:rotate` validate the slug against the file's own heading?** See Gotcha 6.
- **Should `scripts/` get a test project?** Four scripts, still zero automated coverage.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
packages/orchestrator/                            [created — package: 5 src files, 3 test files, README, configs]
apps/cli/src/git.ts                               [created — the GitRunner implementation]
apps/cli/src/scan-scope.ts                        [created — --diff wiring: ScanScope, resolveChanges, narrowToChanges]
apps/cli/src/scan.ts                              [modified — planScan split, scope threaded through]
apps/cli/src/check.ts                             [modified — line filtering + diffBase option]
apps/cli/src/main.ts                              [modified — --diff <ref> on check]
apps/cli/package.json                             [modified — @argus/orchestrator dependency]
apps/cli/tests/check-diff.test.ts                 [created — end-to-end against a real repo]
apps/cli/tests/git.test.ts                        [created — the subprocess, against a real git]
apps/cli/tests/{support,main}.test.ts             [modified — gitRepo helper, two --diff cases]
dependency-cruiser-rules.cjs                      [modified — two orchestrator rules]
vitest.config.ts, Dockerfile.dev, docker-compose.yml [modified — new-package wiring]
docs/adr/0008-scan-scope-orchestration.md         [created — the injected-git boundary]
docs/guide/cli.md                                 [modified — §Only what changed, exit codes, global flags]
docs/architecture.md                              [modified — orchestrator row, count → nine]
docs/plan/phases/phase-02-mvp.md                  [modified — P2-05 rulings]
docs/progress.md                                  [modified — P2-05 entry]
docs/IMPLEMENTATION.md                            [modified — row, Up Next, counters]
docs/HANDOVER.md                                  [rewritten — this file]
docs/handovers/doc-06-audit-backlog-handover.md   [created — by the rotation script]
```

## Sign-off

The acceptance criteria were two lines and the work was almost entirely in what they left unsaid. "Analyses only files changed since `main`" has four defensible readings, and the difference between them is whether a reviewer sees a colleague's warnings under their own name, whether a brand-new file is checked at all, and whether the line numbers refer to the file on disk. None of those choices announce themselves: pick wrong and you get a clean scan that exits 0, which is the same thing you get when the code is fine. That is the whole reason the git calls are injected — not architectural taste, but that it made twenty-odd diff shapes cheap enough to actually test, and the quiet ones are the ones that matter. The dogfood gate then caught me doing exactly what the rules exist to catch, in the file arguing for careful boundaries.

— claude-opus-5
