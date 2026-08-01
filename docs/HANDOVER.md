# Handover — DOC-05 filed (documentation cadence) + post-merge close-out

**From:** claude-opus-5
**To:** next picker (Phase 2 continues — M1 showcase tail)
**Date:** 2026-08-01
**Phase:** P2 — MVP (5/6 numbered · 3/7 added) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-02 — **merged** ([#41](https://github.com/WeaversMask/argus-oss/pull/41)). This session filed a new task rather than building one; its own PR is open.

---

## Context

**Everything opened to date is merged** — OPS-06 ([#42](https://github.com/WeaversMask/argus-oss/pull/42)) and DOC-02 ([#41](https://github.com/WeaversMask/argus-oss/pull/41)) both landed after the previous handover was written, so the tracker's "In Progress" row and one `_pending_` PR link were stale on arrival. That close-out is part of this branch.

The substance of the session is a **maintainer directive**: if the project continues past the MVP, the documentation structure must be updated **comprehensively after every completed phase** and **iteratively after every task/story** — the smaller tier sized so that a third party can check progress without reading the tracker. Filed as **DOC-05** in the Phase 2 M1 tail. It is **specced, not built** — see What I Did NOT Do.

Why it is a real gap and not ceremony: the per-task documentation obligation in [`plan/03-documentation.md`](./plan/03-documentation.md) is **prose that nothing checks**, the same shape as the notices-freshness claim OPS-06 had to close after six tracker rows asserted it against no mechanism. And there is no third-party-readable progress surface at all — this tracker's task rows are agent-facing forensics (several run past a thousand words), which is correct for the next picker and useless to anyone asking "what has this actually delivered, and when?"

## What I Did

- **Closed the books on the merged work:** DOC-02's `_pending_` → [#41](https://github.com/WeaversMask/argus-oss/pull/41), In Progress cleared, Up Next re-ranked, header and Phase Status corrected to post-merge reality.
- **Filed DOC-05** in [`plan/phases/phase-02-mvp.md`](./plan/phases/phase-02-mvp.md) with deps, outputs, and acceptance criteria — two tiers: a mechanical per-task `docs-delta` CI gate plus a `docs/progress.md` entry per merged task, and a per-phase consolidation pass a phase must pass **before** it can be marked ✅ Complete.
- **Wired it into the plan** so it cannot be forgotten: roadmap M1 gains criterion 7 (continuation stays _legible_), the Phase 2 exit criteria gain the consolidation pass, and `03-documentation.md` gains a short "Cadence — specced as DOC-05, not yet installed" section that names the gap in its own standard.
- **Made the Phase Status counter legible** — `5/6+5` became `5/6 numbered · 3/7 added`, with the notation defined under the table (see Gotcha 1).

PRs merged in this session: none — this branch's PR is the session's output.

## What I Did NOT Do (Deferred)

- **Implemented DOC-05.** Deliberate: the ask was to file the task. Nothing exists yet of `docs/progress.md`, the `docs-delta` CI job, `templates/PHASE-DOC-AUDIT.template.md`, the phase 3–11 exit-criteria lines, or the `agentic-execution.md` edits. Until DOC-05 lands, the documentation delta is still an honour-system checklist item.
- **DOC-03 / DOC-04.** Untouched, and still the natural next picks — DOC-05 depends on both.
- **The failing weekly Stryker job** (red since 2026-07-28, logs expired) and **`argus explain` not reporting fixability** — both inherited, both still open, both still needing their own task.

## Gotchas & Surprises

1. **The `+N` in the old `5/6+5` counter was undefined and a task behind.** Decoding it needed git archaeology: it went `+4` → `+5` when OPS-06 merged but did **not** move when DOC-02 merged, so it counts _tasks added to the phase_, not tasks completed — and under that definition the real figure was already 6, not 5. The DOC-02 review had flagged the tracker and handover disagreeing about this exact notation; an opaque number that two documents can disagree about is not a metric. Now spelled out under the Phase Status table.
2. **DOC-05 cannot be the phase's last task**, even though it is filed last-but-one. Its acceptance requires the consolidation pass to be _executed once against Phase 2 itself_ — a checklist that has never been run is exactly the untested-gate failure mode this repo keeps re-learning. OPS-05 stays last because it re-verifies everything, DOC-05 included.
3. **The `docs-delta` gate must apply from its merge forward.** A gate that retro-judges merged work turns every later branch red for history nobody can change; the spec says so explicitly so the implementer does not have to rediscover it.
4. **A filing task still owes the checklist.** This one produces no code, so there is no dogfooding delta and no ADR — but it does touch the plan docs other tasks read, which is exactly the "plan/doc changes land first as their own small PR" rule. Treat it as light-tier for review.

## State of the System

- ✅ Docs-only diff — no executable code, no dependency, no schema touched
- ✅ Root gates re-run before push (lint, typecheck, build, test, format:check) — see the PR for the run
- ✅ Self-scan unchanged at **0 violations, 0 failures, 151 files** (no source files added or removed)
- ⚠️ **Weekly Stryker mutation job still red since 2026-07-28** — report-only, gates nothing, needs its own task; do not cite 85.74% as current
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`) — inherited, unrelated to this diff
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **DOC-03 — workflow showcase** (`docs/workflow.md`). Unblocked since DOC-02 merged; the README receipts table is the shortlist of guardrails and its links are already verified — reuse rather than re-source.
2. **DOC-04 — developer tour** (`docs/dev/tour.md`).
3. **DOC-05 — documentation cadence.** Needs 1 and 2 first: its Phase 2 consolidation pass audits the tree they complete.
4. **OPS-05** last, then the phase transition. **P2-05 (diff mode)** whenever the maintainer wants the final numbered task; nothing waits on it.

Estimated effort: DOC-03 **M**, DOC-04 **S**, DOC-05 **M**, OPS-05 **S**.

## Open Questions for the Next Agent

- **Does `docs/progress.md` earn its keep, or should the per-task tier be a `CHANGELOG.md`?** DOC-05 specs a progress log because the audience is "someone checking whether this project is alive and moving", not "someone upgrading a dependency" — but a changelog is the more conventional artifact and a public repo may be read as if it had one. Worth a maintainer opinion before DOC-05 starts, since seeding it retroactively is most of the task's cost.
- **Should the consolidation pass also gate the M1 boundary itself, or only phase transitions?** As specced it does both — Phase 2's exit criteria now carry it — but that makes M1 marginally more expensive to declare.

Carried forward, still open:

- Should `scripts/` get a test project? Three CI-relevant scripts have zero automated coverage.
- Should `notices:check` join the pre-push hook? ~3s per push to catch drift before CI.

## Files Touched This Session

```
docs/handovers/doc-02-showcase-readme-handover.md  [created — rotation snapshot]
docs/HANDOVER.md                                   [rewritten — this file]
docs/IMPLEMENTATION.md                             [modified — close-out, Up Next, counter]
docs/plan/phases/phase-02-mvp.md                   [modified — DOC-05 spec, exit criteria]
docs/plan/02-roadmap.md                            [modified — M1 task list, criterion 7]
docs/plan/03-documentation.md                      [modified — cadence forward-pointer]
```

## Sign-off

The tracker matches the repository: nothing is in flight, every opened PR is merged, and the one number that had been drifting is now defined where it is printed. DOC-05 is specified to the same bar as the tasks around it and is **not** implemented — the next picker takes DOC-03.

— claude-opus-5
