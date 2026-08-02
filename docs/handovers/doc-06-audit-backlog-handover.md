# Handover — DOC-06 complete (the Phase 2 audit's filed findings) · backlog empty

**From:** claude-opus-5
**To:** next picker (Phase 2 — OPS-05 is the last M1 task; P2-05 whenever)
**Date:** 2026-08-02
**Phase:** P2 — MVP (5/6 numbered · 7/8 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-06 — the three findings the Phase 2 documentation audit filed rather than fixed. PR open, awaiting merge.

---

## Context

DOC-05 installed the documentation cadence and ran its per-phase pass for the first time. That pass found six things, fixed three, and **filed three** as too large for its own PR. DOC-06 is those three. The [audit](../audits/phase-02-doc-audit.md) backlog is now empty; M1 still needs only **OPS-05**.

All three landed on one branch deliberately: they are docs-tier, they came from one audit, and three branches from `main` would have collided on `IMPLEMENTATION.md` and this file — agents never merge, so they could not have been serialised.

## What I Did

- **Handover link rot — fixed at the cause.** [`scripts/rotate-handover.mjs`](../../scripts/rotate-handover.mjs) (`pnpm handover:rotate <slug>` · `pnpm handover:check`) re-resolves every relative link as it copies, refuses to overwrite an existing snapshot, and fails closed. Its `--repair` mode fixed the existing archive with the same code. [§Handover Rotation](../plan/protocols/agentic-execution.md) now calls the script and says why `cp` is wrong, and **`pnpm handover:check` runs as a step in CI's `lint` job** so a hand-rolled `cp` fails loudly. Registered in [`quality-gates.md`](../plan/protocols/quality-gates.md).
- **[`dev/adding-an-adapter.md`](../dev/adding-an-adapter.md)** — the `packages/adapters/*` recipe, from P2-06. Package shape, the repo-wiring checklist, the contract-test split.
- **[ADR-0007](../adr/0007-api-contracts-boundary.md)** — the zod-only `@argus/api-contracts` boundary, its three rejected alternatives, and its permanent cost. Cross-linked from `architecture.md` and the package README, which previously carried the rationale in prose alone.

## What I Did NOT Do (Deferred)

- **`adding-a-tool-adapter.md` stays unwritten.** `dev/README.md` still reserves it for Phase 4. Everything specific to `ToolAdapterPort` — `packages/adapters/_shared/`, subprocess timeouts, severity translation, secret redaction, the copyleft subprocess boundary — does not exist yet, and writing it now would be precisely the true-when-written claim this audit exists to catch. `adding-an-adapter.md` covers what is real and links forward.
- **The repo-wide link check is still not a CI gate.** DOC-05's open question is now half-answered: the **archive** is gated (`handover:check`, `lint` job), because that is where rotation does its damage. All of `docs/` is not — the repo-wide oracle still runs only per-phase, from the audit template. Widening it is a small, separate decision.
- **Snapshots carry no "this is a dated snapshot" banner.** The audit noted nothing on the files says so. 36 files; not attempted here.
- **`scripts/` still has no automated coverage** — this is now the **fourth** script in it. See Gotcha 3.
- **Still inherited, still each needing their own task:** the missing `FormatterPort` fake (10 fakes for 11 ports), the weekly Stryker job red since 2026-07-28, `argus explain` not reporting fixability, `ci.yml`'s stale `license` job comment, and `review-gate`'s frozen-PR-body trap (Gotcha 2 of the previous handover).

## Gotchas & Surprises

1. **It was 99 systematic breaks, not 100.** The mechanical repair fixed 99 and left one standing — `p2-02`'s link to `apps/cli/src/format.ts`, a file P2-03 deleted when it added `formatters/`. The path re-resolution was correct; the target is simply gone. **Fail-closed is what surfaced it** — a script that reported "100 fixed" and exited 0 would have hidden a second, unrelated defect inside the first. I **unlinked** it rather than repointing it at `formatters/console.ts`: the snapshot says `format.ts` is a placeholder P2-03 should replace, which was true; repointing would make it claim something that never was. That ruling is now written into §Handover Rotation — **archived handovers are edited only to keep links resolving.**
2. **The rot was still live, and the script proved it on its own first run.** Rotating DOC-05's handover re-resolved **7** links — i.e. had I rotated by hand, this PR would have shipped 7 fresh breaks into the directory it was cleaning. The fix and its own regression test are the same command.
3. **A pure-text transform is easy to verify exactly, so verify it exactly.** With every link target masked to a constant, 27 of the 28 rewritten snapshots are byte-identical to `HEAD` (the 28th is `p2-02`, where I intentionally removed a link). That check is worth more than reading diffs, and it is two lines of shell — the diff was 86 insertions and 86 deletions across files nobody would have proofread.
4. **`scripts/` is inside the `docs-delta` gate's definition of source** (`^(packages|apps)/.+/src/|^scripts/`), which surprised me — the PR template says so, `03-documentation.md` is where I'd have looked. Irrelevant here (this PR is almost all documentation), but a future `scripts/`-only change must record a delta or justify none.
5. **ADR-0007's real content turned out to be the cost, not the decision.** The rationale was already written in four places and enforced by `api-contracts-only-zod`; restating it adds nothing. What nothing recorded: **severity is the only shared vocabulary with an agreement test.** `positionSchema` re-implements ADR-0004's 1-based end-exclusive semantics independently of core's `position` factory and **nothing asserts they agree** — verified, not assumed. Phases 6–8 widen this payload a lot. Every shared vocabulary needs its own agreement test at its mapping site, or the boundary quietly becomes drift that presents as a consumer parsing a valid document into wrong values.

6. **The review's most useful finding was about what the fix does not cover, not what it gets wrong.** Cross-family full-packet review returned APPROVE WITH NITS, no HIGH findings; it re-verified the recipe's wiring claims and ADR-0007's central claim independently and both held. Its MED was that `handover:check` existed but nothing ran it — the repo gates every comparable script in CI (`format:check`, `license-check`, `notices:check`), and a mechanism invoked only when an agent remembers to invoke it is the same class of thing as the checklist step it replaced. Acted on: it is now a `lint` step. Three LOWs also acted on — nested fences (a four-backtick block containing a three-backtick one closed early; now tracks marker character and length per CommonMark), the invisibility of reference-style/HTML links to **both** the rewriter and `--check` (documented — "all links resolve" is a claim about inline links only), and the non-atomic retry path. One LOW declined: wrapping every `readFileSync` in `try`/`catch`. An uncaught I/O error still exits non-zero, so the script still fails closed; the noise would buy nothing.

## State of the System

- ✅ Root gates green: `lint`, `typecheck`, `build`, `test` (70 files, 737 tests), `boundaries` (248 modules, 847 deps, 0 violations)
- ✅ Repo-wide link oracle: **0 broken relative links** (was 101 at the audit)
- ✅ Self-scan clean: 152 files, 0 violations, 0 failures, exit 0 — and `scripts/rotate-handover.mjs` confirmed **in** scope (scanned individually), not silently skipped
- ✅ `pnpm handover:rotate` exercised for real on this session's own rotation; overwrite guard and cleanup verified
- ⚠️ Weekly Stryker still red since 2026-07-28 — report-only; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`)
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **OPS-05 — go-public readiness sweep**, effort S. The last M1 task. It inherits one correction rather than a question: [runbook](../go-public-runbook.md) item 7 misdescribes how the maintainer's real name reaches history. Measured: **79 of 205 commits** — 52 web-UI merges (name in _author_) plus 27 rewritten by a web-UI "Update branch"/"Rebase and merge" (name in _committer_, invisible without `%cn`). **Zero** locally-made commits are affected, and the paranoia check passes clean. The name is public on the GitHub profile by choice, so "optional, cosmetic" stands — fix item 7's wording only.
2. **Then the phase transition**, which re-runs the consolidation pass. Phase 2's report was written mid-phase and says so; P2-05 and OPS-05 add surface it never saw. Start with §6's link check and §1's counts — both cheap, both mechanical, and between them they caught most of what the first pass found.
3. **P2-05 (diff mode)** whenever the maintainer wants the final numbered task; nothing waits on it.

## Open Questions for the Next Agent

- **Should the link check widen from the archive to all of `docs/`?** The archive half is now gated per PR. The rest of `docs/` is still checked only at phase boundaries, and DOC-05's audit found its one live break there, not in the archive.
- **Should TSDoc coverage get an oracle?** Still nothing counts "every public export carries TSDoc"; `docs-delta` watches it per task, which is not the same as measuring it.
- **Should `scripts/` get a test project?** Now four scripts, still zero automated coverage. `rotate-handover.mjs` is a pure text transform and would be the easiest of the four to test.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
scripts/rotate-handover.mjs                       [created — rotation + archive repair, fails closed]
package.json                                      [modified — handover:rotate / handover:check]
.github/workflows/ci.yml                          [modified — handover:check step in the lint job]
docs/plan/protocols/quality-gates.md              [modified — registry row for the new check]
docs/dev/adding-an-adapter.md                     [created — the packages/adapters/* recipe]
docs/adr/0007-api-contracts-boundary.md           [created — the zod-only boundary + its cost]
docs/handovers/*.md                               [modified ×28 — 99 links re-resolved, 1 unlinked]
docs/plan/protocols/agentic-execution.md          [modified — §Handover Rotation: script, not cp]
docs/plan/phases/phase-02-mvp.md                  [modified — [DOC-06] filed]
docs/dev/README.md                                [modified — recipe table row]
docs/architecture.md                              [modified — ADR-0007 link]
packages/api-contracts/README.md                  [modified — ADR-0007 link ×2]
docs/progress.md                                  [modified — DOC-06 entry]
docs/IMPLEMENTATION.md                            [modified — row, Up Next, counters]
docs/HANDOVER.md                                  [rewritten — this file]
docs/handovers/doc-05-documentation-cadence-handover.md [created — by the new script]
```

## Sign-off

Three findings, and the one that mattered was the one that looked most like clerical work. A hundred broken links is a boring number; the interesting part is that the rotation step had been "copy the file" in a checklist since P0, and every agent who ran it did so correctly. The instruction was the defect. Replacing it with a better instruction would have produced the same outcome more slowly, which is why the fix is a command that cannot be run wrong — and the proof it was needed is that its very first real use re-resolved seven links in the handover of the task that filed the finding. The other two findings were documentation debts with the same shape as the audit's own lesson: the adapter recipe was missing because nothing treated a nested directory as a first-class thing, and ADR-0007 was missing because a decision enforced in CI feels recorded. Writing it down is what surfaced the part nobody had noticed — that only one of the two duplicated vocabularies is actually held in step by a test.

— claude-opus-5
