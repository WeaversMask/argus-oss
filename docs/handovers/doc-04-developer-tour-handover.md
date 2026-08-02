# Handover — DOC-04 complete (developer tour) · M1 documentation tail closed

**From:** claude-opus-5
**To:** next picker (Phase 2 continues — DOC-05, then OPS-05)
**Date:** 2026-08-02
**Phase:** P2 — MVP (5/6 numbered · 5/7 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-04 — [`docs/dev/tour.md`](../dev/tour.md). PR open, awaiting merge.

---

## Context

DOC-02 gave the repo a README, DOC-03 explained the process, DOC-04 explains the **code**: five ordered stops, 52 lines, from the architecture map through one built-in rule end-to-end, ending where [`adding-a-rule.md`](../dev/adding-a-rule.md) reads as instructions rather than new concepts.

**With this, the M1 documentation tail is complete.** DOC-05 is unblocked — its Phase 2 consolidation pass audits exactly the tree DOC-03 and DOC-04 just finished — and is the next pick.

## What I Did

- **Wrote [`docs/dev/tour.md`](../dev/tour.md)**, linked from `dev/README.md` and `architecture.md` (both required by the spec) plus the `docs/README.md` map.
- **Followed the code over the spec, twice** — see Gotchas 1 and 2. Both were caught by checking source rather than the docs that describe it.
- **Corrected `architecture.md`** where it asserted something false that the tour would have relayed.
- **Ran the review, then acted on it.** Light tier, cross-family (claude-fable-5): one MAJOR, three MINORs, one NIT — all applied.
- **Closed the books:** tracker header, Up Next re-ranked to DOC-05, counter `4/7` → `5/7`, Recently Completed row, handover rotated.

PRs merged in this session: DOC-03 ([#44](https://github.com/WeaversMask/argus-oss/pull/44)). This branch's PR is the session's remaining output.

## What I Did NOT Do (Deferred)

- **`FormatterPort` has no in-memory fake.** Ten fakes for eleven ports (Gotcha 2). Real gap, needs its own small task — add `packages/testing/src/mocks/fake-formatter.ts`, export it, then revert the "ten of the eleven" wording in `architecture.md` (two places) and `tour.md` back to "every port".
- **The phase file's DOC-04 spec still says "fixture → rule → finding → violation"**, which is wrong (Gotcha 1). Left alone deliberately — editing a spec after building against it is how a checklist stops meaning anything. Correct it when `phase-02-mvp.md` is next touched, or note it in the DOC-05 audit.
- **The failing weekly Stryker job** (red since 2026-07-28) and **`argus explain` not reporting fixability** — both still inherited, both still needing their own task.
- **`ci.yml`'s stale `license` job comment** (claims it is not a required check; it is). One-line fix, still open from DOC-03.

## Gotchas & Surprises

1. **`Finding` is not in the rule path, despite the spec's arrow diagram saying so.** Grep `rule-engine/src` and `rules-builtin/src`: zero hits. `Finding` is the `ToolAdapterPort` type — raw output from external tools (jscpd, Semgrep), Phase 4, no adapter built yet. A built-in rule calls `context.report(...)` and the **engine** constructs the `Violation`. This matters beyond wording, because `finding.ts` sits directly beside `violation.ts` in `core/src/domain/` and a newcomer will open both. The tour now warns about it explicitly. **Two specs in a row have had a wrong parenthetical** (DOC-03's "gitleaks negative tests" was the other) — treat the arrow diagrams in phase files as intent, not as API.
2. **`@argus/testing` ships 10 fakes for 11 ports, and three docs claimed otherwise.** `core/src/ports/index.ts` exports 11; `testing/src/mocks/index.ts` exports 10; `FormatterPort` (P2-06) has none. I wrote the false claim into the tour by taking it from [`architecture.md`](../architecture.md) — **the exact failure DOC-03 was written to warn about**, committed one task later by its own author. The reviewer caught it. Both files are fixed. **When a doc states a countable fact, count it.**
3. **The tour tripped its own trap.** Stop 2 teaches that "finding" is a reserved word here; stop 5 then said the dogfood gate "fails on any finding". Harmless in any other document — this is the one where it isn't. Watch for vocabulary you have just made load-bearing.
4. **"Activation" was undefined in both the tour and the recipe** — the only real prerequisite gap against "a newcomer completes `adding-a-rule` unaided". Now glossed at first use. If you extend the recipe, check its vocabulary against what a tour reader actually has.

## State of the System

- ✅ Docs-only diff — no executable code, no dependency, no schema touched
- ✅ Root gates green: lint · typecheck · build · `format:check`, **737/737 tests**, coverage 97.91% / 94.26%
- ✅ Self-scan unchanged at **0 violations, 0 failures, 151 files**
- ✅ All 13 relative links in `tour.md` verified on disk; every code claim in it re-verified against source by the reviewer
- ⚠️ **Weekly Stryker mutation job still red since 2026-07-28** — report-only; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`) — inherited; both passed this session
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **DOC-05 — documentation cadence**, effort **M**. Now unblocked. Read its spec carefully: the `docs-delta` gate must resolve the TSDoc-inside-`packages/*/src/**` problem explicitly, and the Phase 2 consolidation pass must actually be **executed once** before the task is called done.
2. **OPS-05** last, then the phase transition.
3. **P2-05 (diff mode)** whenever the maintainer wants the final numbered task; nothing waits on it.

Two cheap tasks worth slotting in whenever: the missing `FormatterPort` fake, and `ci.yml`'s stale comment.

## Open Questions for the Next Agent

- **Does `docs/progress.md` earn its keep, or should the per-task tier be a `CHANGELOG.md`?** Carried forward — still wants a maintainer opinion **before** DOC-05 starts, since seeding it retroactively is most of the task's cost. This is now the blocking question, not a background one.
- **Should the consolidation pass also gate the M1 boundary itself, or only phase transitions?** As specced it does both.
- **For OPS-05 — a correction to inherit, not a question.** [Runbook](../go-public-runbook.md) item 7 describes one of two routes by which the maintainer's real name reaches history. Measured: **79 of 205 commits** — 52 web-UI merges (name in _author_) plus 27 rewritten by a web-UI "Update branch"/"Rebase and merge" (name in _committer_, invisible without `%cn`). **Zero** in both fields, so no locally-made commit is affected. The paranoia check passes clean (0 personal-email hits). The name is public on the GitHub profile by choice, so "optional, cosmetic" stands; fix item 7's wording only.

Carried forward, still open:

- Should `scripts/` get a test project? Three CI-relevant scripts have zero automated coverage.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
docs/dev/tour.md                                     [created — the deliverable]
docs/handovers/doc-03-workflow-showcase-handover.md  [created — rotation snapshot]
docs/HANDOVER.md                                     [rewritten — this file]
docs/IMPLEMENTATION.md                               [modified — row, Up Next, counter]
docs/architecture.md                                 [modified — tour link + the fake-count correction]
docs/dev/README.md                                   [modified — tour link]
docs/README.md                                       [modified — map + For Humans]
```

## Sign-off

The tour is short on purpose and every claim in it was checked against source — including the one I got wrong by trusting a sibling document, which is the lesson of the session and is written into Gotcha 2 rather than quietly patched. The M1 documentation tail is closed. DOC-05 is next, and it wants a maintainer answer on `progress.md` before it starts.

— claude-opus-5
