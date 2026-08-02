# Handover — DOC-05 complete (documentation cadence) · M1 documentation tail closed

**From:** claude-opus-5
**To:** next picker (Phase 2 — OPS-05 is the last M1 task; P2-05 whenever)
**Date:** 2026-08-02
**Phase:** P2 — MVP (5/6 numbered · 6/7 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-05 — the documentation cadence. PR open, awaiting merge.

---

## Context

DOC-02/03/04 made the repo legible **at** the M1 boundary. DOC-05 keeps it legible **if work continues**: the per-task documentation obligation is now a CI gate instead of a checklist line, there is a third-party-readable [`progress.md`](./progress.md) seeded back to the first commit, and every phase from 3 to 11 carries a documentation-consolidation pass as an exit criterion.

**The whole M1 documentation tail is now complete.** What remains for M1 is **OPS-05**, specced to run last because it re-verifies everything else.

## What I Did

- **`docs-delta` job in [`ci.yml`](../.github/workflows/ci.yml)**, modelled on `review-gate` — no checkout, fails closed, drafts and bot authors exempt.
- **[`progress.md`](./progress.md)** — ~50 entries across Phases 0–2, dated and linked.
- **[`PHASE-DOC-AUDIT.template.md`](./plan/templates/PHASE-DOC-AUDIT.template.md)**, every check carrying a runnable oracle, plus the exit criterion in **all nine** remaining phase files.
- **Cadence written once** into [`03-documentation.md`](./plan/03-documentation.md); the protocol's §Task Completion Checklist and §Phase Transitions link it rather than restate it.
- **Ran the Phase 2 audit for real** → [`audits/phase-02-doc-audit.md`](./audits/phase-02-doc-audit.md). 6 findings: 3 fixed in this PR, 3 filed.

## What I Did NOT Do (Deferred)

- **The three audit findings I filed, all unblocked and all small:**
  1. **100 rotted links in `docs/handovers/`** — needs the bulk rewrite **and** a fix to §Handover Rotation, which is the cause. I fixed this session's own snapshot by hand; it is the only one in that directory that resolves.
  2. **`dev/adding-an-adapter.md`** — `@argus/adapters-prettier` is the first `packages/adapters/*` member and has no recipe. Phase 4 is a whole phase of adapters.
  3. **ADR-0007 for the `@argus/api-contracts` zod-only boundary** — it has a dependency-cruiser rule enforcing it and no recorded rationale.
- **`review-gate` still reads the frozen PR body** (Gotcha 2). One-line fix, deliberately not made here — changing a live enforced gate inside DOC-05's diff muddies both reviews.
- **Maintainer action, not an agent one: add `Documentation delta` to the branch-protection required-checks set.** Until then the gate is a visible red X, not a merge blocker — the same pending admin step `review-gate` has carried since OPS-04a. Recorded in `quality-gates.md`.
- **`/pulls/N/files` is fetched twice** in the gate (names, then patches). Benign — two reads of the same immutable PR head — but a future tidy could halve the API cost.
- **Still inherited, still each needing their own task:** the missing `FormatterPort` fake (10 fakes for 11 ports), the weekly Stryker job red since 2026-07-28, `argus explain` not reporting fixability, and `ci.yml`'s stale `license` job comment.

## Gotchas & Surprises

0. **The review caught a fail-open I had already "verified": `packages/` nests, and my source pattern assumed it didn't.** `^(packages|apps)/[^/]+/src/` matches one segment before `src/`, so `packages/adapters/prettier/src/**` — the repo's only adapter package — took the "no source paths touched" branch and passed. One of nine packages silently exempt, and the seed of the family **Phase 4 multiplies**. My 34 regex cases used flat layouts only; the spec's glob has the same blind spot and I implemented it faithfully. **A pattern is a claim about paths — enumerate the real ones.** Now `^(packages|apps)/.+/src/`, with grep and gojq verified to agree, and a nested-package regression test. Three smaller review findings alongside it, all fixed: a patch-less file masked a real TSDoc delta (branch ordering), the failure message's own `<one-line reason>` placeholder passed the gate verbatim, and `quality-gates.md` — the canonical per-PR registry — had no row for the new gate. **If you add a path pattern anywhere in this repo, test it against `packages/adapters/prettier/`.**

1. **The TSDoc ruling is the load-bearing decision in this task, and it went the harder way.** Five capture streams live outside source; the sixth — TSDoc — lives inside `packages/*/src/**`, exactly the paths the gate calls "source". A path-only gate cannot distinguish a TSDoc-only PR from one with no delta, and would force a false `no docs delta` onto a change that is nothing but documentation. **A gate you must lie to in order to pass trains the exact reflex it exists to prevent**, so the job inspects diff content for changed doc-comment lines. `//` comments are deliberately excluded — including them passes nearly every diff and guts the gate. All three accepted imprecisions are written into the workflow comment, not left for the first false positive to find.
2. **`review-gate` has a stale-body trap and `docs-delta` deliberately does not.** `github.event.pull_request.body` is frozen at trigger time, so editing a description and re-running replays the old text. `review-gate`'s "RE-RUN this job" advice therefore only really works for its comment path. `docs-delta` fetches the body live via `gh api`. Worth porting back.
3. **A doc claim that was true when written is the failure mode this whole task exists for, and the audit found two.** `guide/rules.md` opened by telling users rules are off until configured — they are **on by default**; true at P2-01, falsified by P2-02, unrevisited for six weeks. `architecture.md`'s "every port has a fake" was the same shape, caught one task earlier. Neither author was careless. **When a doc states something a later task could falsify, it needs an oracle, not a proofread.**
4. **Handover rotation is what rots the archive.** `HANDOVER.md` lives at `docs/` and its links are written relative to `docs/`; copying it into `docs/handovers/` breaks every one. 100 links, one cause, invisible for months because nobody clicks links in an archive.
5. **`progress.md` links merge commits, not PRs, for anything before 2026-07-05.** Those PRs live in the retired pre-scrub repo, which is frozen and will never be public — the links would be permanently dead. The commits carried over into this repo, so they resolve. This is explained in the file's header; don't "fix" it into PR links.
6. **The gate passes trivially on its own PR.** This diff is docs + CI and touches no source, so `docs-delta` short-circuits at "no source paths touched". The negative test in both directions needs a throwaway source-touching PR — see below.

## State of the System

- ✅ Docs + CI only — no executable source, no dependency, no schema touched
- ✅ `ci.yml` parses as YAML; the new job's four regexes unit-tested locally against 34 cases (all pass)
- ✅ **`docs-delta` negative-tested in both directions** on throwaway PR #48, now closed and its branch deleted. Direction 1 failed with the intended annotation; direction 2 passed after a description edit and a **job re-run with no new commit** — which also proves the live-body fetch. Evidence comment on the PR. **Two attempts failed first, both instructive: (a)** a temp commit on the DOC-05 branch cannot test the fail direction, because the gate evaluates the PR's whole file set and a documentation PR always contains docs — the gate was right, the test was wrong; **(b)** a throwaway branched from `main` runs no gate at all, since `main` lacks the job. The branch must carry `ci.yml` but **not** `PR.template.md`, which lives under `docs/` and would satisfy the gate by itself.
- ✅ Root gates + self-scan green; all 12 CI checks green on the PR
- ⚠️ Weekly Stryker still red since 2026-07-28 — report-only; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`)
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **OPS-05 — go-public readiness sweep**, effort S. The last M1 task. It inherits one correction rather than a question: [runbook](./go-public-runbook.md) item 7 misdescribes how the maintainer's real name reaches history. Measured: **79 of 205 commits** — 52 web-UI merges (name in _author_) plus 27 rewritten by a web-UI "Update branch"/"Rebase and merge" (name in _committer_, invisible without `%cn`). **Zero** locally-made commits are affected, and the paranoia check passes clean (0 personal-email hits). The name is public on the GitHub profile by choice, so "optional, cosmetic" stands — fix item 7's wording only.
2. **Then the phase transition**, which now includes running the consolidation pass again — Phase 2's report was written mid-phase and says so; P2-05 and OPS-05 add surface it never saw.
3. **P2-05 (diff mode)** whenever the maintainer wants the final numbered task; nothing waits on it.

The three filed audit findings are all good small-session work if you want something cheap first.

## Open Questions for the Next Agent

- **Should the link checker become a CI gate rather than a per-phase oracle?** It found 101 broken links in seconds and is ~10 lines of Node with no dependency. Left out of DOC-05 deliberately — the spec asked for a per-phase pass, not another gate — but drift accumulates for a whole phase between runs.
- **Should TSDoc coverage get an oracle?** The audit could not check "every public export carries TSDoc" because nothing counts it. `docs-delta` watches it per-task, which is not the same as measuring it.

Carried forward, still open:

- Should `scripts/` get a test project? Three CI-relevant scripts have zero automated coverage.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
docs/progress.md                                  [created — the third-party tier, Phases 0–2]
docs/audits/phase-02-doc-audit.md                 [created — the executed pass]
docs/plan/templates/PHASE-DOC-AUDIT.template.md   [created — the repeatable checklist]
.github/workflows/ci.yml                          [modified — the docs-delta job]
docs/plan/03-documentation.md                     [modified — cadence installed, written once]
docs/plan/protocols/agentic-execution.md          [modified — checklist + phase-transition links]
docs/plan/phases/phase-0[2-9]*.md, phase-1[01]*.md [modified — consolidation exit criterion ×10]
docs/plan/phases/phase-00-foundation.md           [modified — audit finding: broken ADR link]
docs/plan/templates/PR.template.md                [modified — delta + progress-log lines]
docs/guide/rules.md                               [modified — audit finding: rules are ON by default]
docs/README.md                                    [modified — audit finding: broken map tree; new entries]
docs/IMPLEMENTATION.md                            [modified — row, Up Next, counter, DOC-04's PR link]
docs/HANDOVER.md                                  [rewritten — this file]
docs/handovers/doc-04-developer-tour-handover.md  [created — rotation snapshot, links re-resolved]
```

## Sign-off

The cadence is installed and it has already earned its place three times over. The first execution of the per-phase pass found a user-facing page telling readers the opposite of what the tool does, and 101 broken links nobody had clicked — both the same failure, a claim that was true when written, which is why every check in the audit template carries a command rather than an instruction to look carefully. The gate's own negative test failed twice before it worked, neither time because the gate was wrong: the first attempt proved nothing and would have shipped as "verified" had it not been run for real. And then the independent review found the thing none of that reached — a fail-open on nested packages, in the one package family the continuation track is about to multiply. Three mechanisms, three different classes of defect, none of which the author caught alone. That is the whole argument for the layered gates, made against the gate that exists to make documentation claims checkable.

— claude-opus-5
