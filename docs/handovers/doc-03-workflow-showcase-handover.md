# Handover — DOC-03 complete (workflow showcase)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues — M1 showcase tail)
**Date:** 2026-08-01
**Phase:** P2 — MVP (5/6 numbered · 4/7 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-03 — [`docs/workflow.md`](../workflow.md). PR open, awaiting merge.

---

## Context

DOC-02 gave the repo a recruiter-tier README with a receipts table. DOC-03 is the other half: **how the work was done**, for a reader who has never seen an agentic workflow. One ASCII diagram of the six-stage loop, one plain-language paragraph per guardrail (each with its mechanism link and one receipt), and an honesty section listing what the process does _not_ cover.

The page is deliberately not a second receipts table. The README answers "is this code good?"; `workflow.md` answers "why should I believe the process that produced it?" — which is why its honesty section is load-bearing rather than decorative.

## What I Did

- **Wrote [`docs/workflow.md`](../workflow.md)** and linked it from the README (after the receipts table, plus the closing pointer), [`dev/README.md`](../dev/README.md), and the [`README.md`](../README.md) document map.
- **Re-derived every receipt from the repo** instead of trusting the spec's shorthand. Two of the spec's own examples did not survive: see Gotcha 1.
- **Ran the review, then acted on it.** Light tier, cross-family (claude-fable-5), CHANGES REQUESTED on two falsifiable overstatements. Both fixed; one became a new entry in the honesty section rather than a softened sentence.
- **Closed the books:** tracker header, Up Next, Phase Status counter (`3/7` → `4/7`), and a Recently Completed row carrying the verification findings.

PRs merged in this session: none — this branch's PR is the session's output.

## What I Did NOT Do (Deferred)

- **DOC-04 / DOC-05 / OPS-05 / P2-05.** Untouched. DOC-04 is the natural next pick and does not depend on DOC-03 merging.
- **The failing weekly Stryker job** (red since 2026-07-28) and **`argus explain` not reporting fixability** — both inherited, both still needing their own task. The Stryker one is now _cited in public documentation_ as an example of an unenforced gate rotting, which raises the cost of leaving it red.
- **The stale `license` job comment** in `ci.yml`, which still says it is not a branch-protection required check — it is one. Found by the reviewer, out of scope here, needs a one-line fix.

## Gotchas & Surprises

1. **Two of DOC-03's own specced receipts were wrong, and checking beat citing.** The spec named "the gitleaks negative tests" — there are none in the tree. The real and better receipt is [#14](https://github.com/WeaversMask/argus-oss/pull/14)'s review finding that gitleaks **exits 0 when its own `git log` fails**, which is why [`.husky/pre-push`](../../.husky/pre-push) now greps the output for `ERR` and fails closed. The spec also named "the mutation baseline", which cannot be a live receipt at all while the job is red — so it became the _lead entry in the honesty section_ instead. **A spec's parenthetical examples are a starting list, not a verified one.**
2. **PR numbers below ~#30 are ambiguous across two repos.** `main` carries **52 merge commits** but `argus-oss` has only **30 merged PRs** — the retired repo's numbering restarts, so `git log` shows two different "Merge pull request #11". Always cite the full `argus-oss` URL; a bare `#N` in prose can resolve to the wrong thing. This is also why "52 merges" and "30 PRs" are both true and not contradictory.
3. **There are two dependency-cruiser files.** `.dependency-cruiser.cjs` is what `pnpm boundaries` actually runs; `dependency-cruiser-rules.cjs` holds the rule list, split out at P2-06 when the list tripped `quality/max-file-length`. Link the rules file when you mean the rules — that is what the README already does.
4. **Any absolute claim in a public doc is a review finding waiting to happen.** Both MAJORs were universals: "reviews **every** diff" (bots are exempt, and `main` already has a merged Dependabot bump) and "**nothing** relies on the agent being careful" (the review gate matches a heading marker, not review quality). Neither was sloppy writing — both were true of the common case and false at an edge the linked file itself documents. On a page whose entire argument is "check this yourself", that is fatal. **Write the scope in, or expect to be caught.**
5. **The review gate is the softest link, and the page now says so.** It greps for an `## Independent review` heading; it cannot judge what is underneath. Worth knowing before you rely on it as though it graded anything.

## State of the System

- ✅ Docs-only diff — no executable code, no dependency, no schema touched
- ✅ Root gates re-run: lint · typecheck · build · `format:check` clean, **737/737 tests**, coverage 97.91% statements / 94.26% branches
- ✅ Self-scan unchanged at **0 violations, 0 failures, 151 files**
- ✅ All 22 relative links in `workflow.md` verified to resolve on disk
- ⚠️ **Weekly Stryker mutation job still red since 2026-07-28** — report-only, gates nothing; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`) — inherited, unrelated to this diff; both passed this session
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **DOC-04 — developer tour** (`docs/dev/tour.md`), effort **S**. The last M1 documentation task. `workflow.md` now covers the process half of orientation, so the tour can stay strictly about the code and link out for the rest.
2. **DOC-05 — documentation cadence**, effort **M**. Needs DOC-04 first: its Phase 2 consolidation pass audits the tree DOC-03 and DOC-04 complete.
3. **OPS-05** last, then the phase transition. **P2-05 (diff mode)** whenever the maintainer wants the final numbered task; nothing waits on it.

## Open Questions for the Next Agent

- **For OPS-05 — not a question, a correction to inherit.** [Runbook](../go-public-runbook.md) item 7 describes **one** of two routes by which the maintainer's real name reaches history, so anyone auditing from it will find commits it cannot explain. Measured on `origin/main` this session: **79 of 205 commits** carry the name — 52 web-UI **merge** commits (name in the _author_ field, committer `GitHub`) **plus 26 + 1 dependabot commits rewritten by a web-UI "Update branch" / "Rebase and merge"** (name in the _committer_ field, author still correctly `WeaversMask`; invisible to a plain `git log`, needs `%cn`). **Zero** commits carry it in both fields — the signature of a bad local config — so nothing committed on the maintainer's machine is affected, and the repo-local identity override is doing its job. **The paranoia check itself passes: 0 hits for the personal email in commit metadata and in tracked file content.** The name is public on the GitHub profile by choice, so the "optional, cosmetic" rating stands; the lever is the **GitHub profile name field**, not git config, and it only affects commits made after it changes. Fix item 7's wording during OPS-05.
- **Does `docs/progress.md` earn its keep, or should the per-task tier be a `CHANGELOG.md`?** Carried from the DOC-05 filing — still wants a maintainer opinion _before_ DOC-05 starts, since seeding it retroactively is most of the task's cost.
- **Should the consolidation pass also gate the M1 boundary itself, or only phase transitions?** As specced it does both.

Carried forward, still open:

- Should `scripts/` get a test project? Three CI-relevant scripts have zero automated coverage.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
docs/workflow.md                                   [created — the deliverable]
docs/handovers/doc-05-cadence-filing-handover.md   [created — rotation snapshot]
docs/HANDOVER.md                                   [rewritten — this file]
docs/IMPLEMENTATION.md                             [modified — row, Up Next, counter]
README.md                                          [modified — two inbound links]
docs/README.md                                     [modified — document map + For Humans]
docs/dev/README.md                                 [modified — Start here link]
```

## Sign-off

The workflow page makes claims a stranger can check, and the ones it could not support were dropped rather than softened — including two the task's own spec had suggested. What the process does _not_ cover is on the same page as what it does, in five entries, not in a footnote. DOC-04 is next and does not wait on this merging.

— claude-opus-5
