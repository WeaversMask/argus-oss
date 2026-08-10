# Handover — OPS-05 complete (go-public readiness) · every Phase 2 task done

**From:** claude-opus-5
**To:** next picker (**the Phase 2 transition** — the only thing left)
**Date:** 2026-08-04 · rebased and re-verified 2026-08-09
**Phase:** P2 — MVP (6/6 numbered · 9/9 added) → Milestone M1 Showcase-Ready
**Last task completed:** OPS-05 — go-public readiness sweep. PR open, awaiting merge.
**Rebased onto:** OPS-07 ([#52](https://github.com/WeaversMask/argus-oss/pull/52), merged
2026-08-04) — the gate-honesty fix this task's own review filed. It landed first, so the
sign-off gate list below is OPS-07's, not the one this session ran against.

---

## Context

OPS-05 verifies that publishing this repository would reveal nothing the maintainer
did not choose to reveal, prepares what a public repo needs, and hands back a list of
what only a human can do. It was specced to run **last** in the phase because it
re-verifies everything else.

**It does not schedule the flip and it could not have.** Going public is
maintainer-only under a standing directive; readiness is not scheduling. That
distinction is restated in the task, the runbook's policy banner, and `CLAUDE.md`,
and the deliverable is deliberately shaped as "everything preparable is done, here is
what is yours".

## What I Did

- **Widened the paranoia check, which was the real finding.** The documented check
  reads `origin/main` — 242 of the 264 commits GitHub would publish **as measured on
  2026-08-04**, and **none** of the 57 `refs/pull/*` refs. That is the exact ref class
  [the runbook](./go-public-runbook.md) itself names as the reason the retired repo can
  never be published. Widened: **0** personal-email hits across **528** identity fields.
  (Every commit total here is a measurement with a date on it, not a constant: `main`
  was 249 commits by 2026-08-09 after OPS-07 merged. The runbook's totals are higher
  again — 267 / 534 — because they count this branch's own commits too. Re-run the
  commands rather than quoting the numbers.) Also swept message bodies and
  trailers, annotated tags (none exist), and `git log -S` over historical file content.
- **Swept two surfaces the runbook does not mention**, both public the instant the repo
  is: **1.05 MB** of PR + issue + review text (0 personal identifiers, 0 emails) and
  **900 Actions job logs / 31.6 MB** (0 hits) — the most recent 900 of roughly 2,556
  job records, the rest having expired on GitHub's side. Both sweeps are recorded in
  the runbook as runnable commands, each with a size floor and a sanity match.
- **Fixed the one real finding** — an archived handover carried an absolute `cd` into
  the maintainer's home directory, forbidden outright by
  [SECURITY-NOTES](./SECURITY-NOTES.md) §Personal Data of Contributors. Now `cd <repo-root>`.
- **Resolved the LICENSE placeholder** to `Copyright (c) 2026 WeaversMask` (maintainer
  ruling, in session), closing the item pending since P0-10 and ADR-0002's `TODO(licensing:)`.
- **Staged badges** in a README HTML comment — CI + License ready to uncomment.
  (Activated 2026-08-10, ahead of the flip; the comment is gone and the two badge
  lines are live. See [runbook step 5](./go-public-runbook.md).)
- **Corrected the runbook** in four places and added a "Readiness sweep" section
  recording what was checked, with re-runnable commands.
- **Re-measured stale numbers** in the README and tracker: 737 → **806 tests**,
  97.9 → **98.0%** statements, 94.3 → **93.9%** branches, self-scan 151 → **160 files**
  (**161** after the OPS-07 rebase added `check-gate-coverage.mjs`; the tracker carries
  the current number).

## What I Did NOT Do (Deferred)

- **The history rewrite.** The home path stays in history by maintainer ruling — see
  Gotcha 3. Recorded in the runbook with the reasoning, not silently dropped.
- **Coverage and mutation badges.** Neither can be honest today: coverage has no
  service wired and a hand-typed percentage goes stale silently; the Stryker job has
  been red since 2026-07-28. This is DOC-02's own precedent for keeping mutation score
  out of the receipts table. (Both were staged as commented notes; when the CI and
  License badges went live on 2026-08-10 that comment was removed, and the reasoning
  moved to [03-documentation.md §A published metric needs a mechanism that keeps it
  true](./plan/03-documentation.md) — a durable home, rather than the runbook, which is
  spent at the flip.)
- **Regenerating the README demo SVG.** It still shows 151 files against today's 161.
  It is a dated recording, internally consistent with its own alt text, and there is no
  generator script — regenerating is DOC-02's territory, not a readiness sweep's.
  **Resolved differently (2026-08-09):** the recording is now dated explicitly — in the
  README prose, in the markdown alt text, and in the asset's own `aria-label` and
  `<title>` — so the count reads as the snapshot it is rather than as a current
  measurement. Re-recording stays DOC-02's call; if it happens, all four places move
  together.
- **Archiving the retired `WeaversMask/argus` repo.** Still private (verified), still
  not archived. Maintainer action, already in the runbook.

- **Still inherited, still each needing their own task:** the missing `FormatterPort`
  fake (10 fakes for 11 ports), the red Stryker job, `argus explain` not reporting
  fixability, `ci.yml`'s stale `license` job comment, `review-gate`'s frozen-PR-body trap.

> **Addendum, 2026-08-10 — the name is settled and two stale links are fixed.** The
> maintainer ruled that this repo **keeps the name `argus-oss`**; runbook step 3
> (renaming it to `argus`) is declined, not pending, and the runbook and the Up Next
> list both say so now. That ruling made a real defect actionable: two links written
> 2026-07-04 — the day work migrated here — still hardcoded the **retired** repo's
> slug, so both would have 404'd for the public on the flip.
> `.github/ISSUE_TEMPLATE/config.yml` sent the "Report a vulnerability" entry in the
> new-issue chooser there, and `bug_report.md` pointed its SECURITY.md link there.
> Both now point at `argus-oss`. **OPS-05's sweep passed with both live**, because it
> looked for identity and secrets and never for what the tree _points at_ — the
> runbook's "Re-running the sweep" section has gained that check, anchored with
> `:(top)` pathspecs and a non-zero floor so it cannot pass by scanning nothing.

## Gotchas & Surprises

1. **Two of my own checks produced false passes, and both printed a clean `0`.** In
   **zsh**, an unquoted `$(git for-each-ref …)` does **not** word-split the way it does
   in bash, so `git log` received one malformed argument; with `2>/dev/null` on the end,
   the failure rendered as `0` hits and looked exactly like a pass. Separately,
   `gh run view --log` returned an **empty file with exit 0**, and grep scored the empty
   file as zero hits. **A security check that cannot distinguish "found nothing" from
   "ran nothing" is not a check.** Both now carry countermeasures in the runbook:
   `--glob` instead of shell splitting, and a size floor plus a sanity pattern that
   must match before any result is believed.
2. **The finding was in the tree, not in history — and not in code.** Every instinct
   here points at commit metadata and at source. The one violation was prose: a note
   one agent left for the next, quoting a path. It had been there since 2026-07-24,
   survived 93 commits, and was carried into a second file by handover rotation — the
   mechanism that exists to preserve those notes faithfully propagated it. **Scan the
   documentation with the same suspicion as the code.**
3. **Writing the finding down reintroduced it.** My first draft of the runbook section
   quoted the offending path verbatim, putting the exact string back into the tree it
   had just been removed from. Only re-running the scan caught it. The documented
   expectation is now pinned at exactly two hits, and the section says why it does not
   restate the pattern — a document that spells out the thing it is looking for becomes
   another instance of it.
4. **`git grep <pattern> HEAD` scans the last commit, not your working tree.** It kept
   showing the path I had already fixed, which reads as "the fix did not work" rather
   than "you have not committed yet". Noted in the runbook next to the command.
5. **`refs/pull/*` is the whole ballgame for a visibility flip.** GitHub keeps those
   refs forever; they survive branch deletion, and they are why the retired repo is
   permanently unpublishable. Any check scoped to `main` is answering a smaller
   question than the one being asked.

## State of the System

- ✅ Root gates green: `lint`, `typecheck`, `test`, `gates:check` (**74 files, 806 tests**)
  — re-run after the OPS-07 rebase, which retired `build` from the list and added
  `gates:check`
- ✅ **The vacuous `pnpm build` gate this task's review surfaced is fixed.** It reported
  success having run **zero tasks** because no workspace package defines a `build`
  script, while being named a sign-off gate in `CLAUDE.md` and asserted green in every
  handover. Filed and shipped as **OPS-07**
  ([#52](https://github.com/WeaversMask/argus-oss/pull/52), merged 2026-08-04): the claim
  was withdrawn rather than the mechanism deleted, and `gates:check` now guards the
  survivors
- ✅ Self-scan clean: **161 files, 0 violations, 0 failures**, exit 0 (re-run after the
  OPS-07 rebase; 160 before it)
- ✅ Coverage 97.91% lines / 93.92% branches / 99.79% functions / 97.98% statements
- ✅ License gate: 563 packages, 4 named exceptions; `notices:check` clean
- ✅ Paranoia check **0** across every publishable ref; tree scan at its documented 2 hits
- ⚠️ Weekly Stryker still red since 2026-07-28 — report-only; do not cite 85.74%
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse
  benchmark, `@argus/cli` `bin.test.ts`)
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **The Phase 2 transition** — the only remaining work, and it re-runs the
   documentation consolidation pass. Phase 2's report was written mid-phase and says
   so; P2-05, OPS-05 and OPS-07 add surface it never saw. Start with §6's link check and §1's
   counts — cheap, mechanical, and between them they caught most of what the first pass
   found. Note `architecture.md`'s package count is now **nine**, and that the phase
   cannot be marked ✅ until that report reads pass.
2. **Do not treat the flip as a follow-up task.** It is the runbook's steps 1 and
   3–7, all maintainer-only (step 2, LICENSE, was closed by OPS-05). An agent's
   involvement ends at the readiness report.

## Open Questions for the Next Agent

- ~~**What to do about the vacuous `pnpm build` gate?**~~ **Answered — shipped as
  OPS-07 ([#52](https://github.com/WeaversMask/argus-oss/pull/52)), merged 2026-08-04.**
  The claim was withdrawn rather than the mechanism deleted, and `gates:check` now
  guards the survivors. Left struck through rather than deleted because this question
  is what filed OPS-07.
- **Should the personal-data scan become a CI gate?** It found something no existing
  gate would have. It is one `git grep` with a pinned expected-hit count, so it is
  cheap — but pinning a count means every legitimate new mention edits the gate.
- **Should `handover:rotate` validate the slug against the file's own heading?** Still
  open from P2-05. This rotation was correct, but nothing checked it.
- **Should the link check widen from the archive to all of `docs/`?** Still open from DOC-06.
- **Should `scripts/` get a test project?** Still zero automated coverage, and **OPS-07
  both widened the gap and filed it** — `check-gate-coverage.mjs` shipped with 14 negative
  cases run by hand, after two reviews found fail-opens in it.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
LICENSE                                        [modified — copyright holder resolved]
README.md                                      [modified — staged badge block, metrics re-measured]
docs/go-public-runbook.md                      [modified — sweep section + 4 corrections]
docs/adr/0002-…-licensing-policy.md            [modified — TODO(licensing:) closed]
docs/handovers/p2-01-builtin-rules-handover.md [modified — home path removed]
docs/IMPLEMENTATION.md                         [modified — OPS-05 + P2-05 rows, Up Next, metrics, ADRs]
docs/progress.md                               [modified — OPS-05 entry]
docs/HANDOVER.md                               [rewritten — this file]
docs/handovers/p2-05-diff-mode-handover.md     [created — by the rotation script;
                                                byte-identical to the copy OPS-07's
                                                session rotated first, so it drops
                                                out of this branch's diff post-rebase]
docs/handovers/ops-07-gate-coverage-handover.md [created — post-rebase, by the rotation
                                                script. OPS-07's handover was live on
                                                `main`; this branch's HANDOVER.md
                                                replaces it, so it is archived here
                                                rather than lost. Maintainer's call,
                                                2026-08-09]
```

## Sign-off

The task's own acceptance criteria were satisfied by the second command I ran. What
took the session was distrusting them: the documented paranoia check passes, and it
passes on a fraction of what publishing exposes. Widening it found nothing — which is
the right outcome and also the one that makes a check feel unnecessary right up until
it isn't. The single real finding came from a direction the runbook does not look at
all, in a handover note rather than in code, and it reached the tree through the
machinery built to preserve such notes faithfully. Then writing it down put it back.
Twice during the sweep a check reported clean because it had failed rather than
because it had passed, both times printing a `0` indistinguishable from a real one.
For a task whose entire output is the sentence "there is nothing here", that failure
mode is the only one that matters, and it is why every count in the report was taken
against a sanity match that had to fire first.

— claude-opus-5
