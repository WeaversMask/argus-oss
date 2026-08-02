# PR Template

## Task

Closes <TASK-ID> — <title>

## Summary

One paragraph describing what changed and why.

## Approach

Brief notes on design choices. Link to relevant ADRs.

## Acceptance Criteria

- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3

## Testing

- [x] Unit tests added/updated
- [x] Integration tests added/updated (if applicable)
- [x] Contract tests pass (if adapter)
- [x] Dogfood scan clean (from Phase 2 onwards)

## Documentation

- [x] `IMPLEMENTATION.md` updated
- [x] `HANDOVER.md` updated for next picker
- [x] ADR added/updated (if architectural)
- [x] **Documentation delta** — name the streams this change touched (package `README.md` · TSDoc · `guide/` · `dev/` recipe · ADR), or state that it has none

<!--
The documentation delta is enforced from DOC-05 onward. The CI `Documentation
delta` job fails a non-draft PR that changes source (any `src/` under
`packages/` or `apps/`, at any nesting depth, plus `scripts/`) while touching no
documentation surface and changing no doc comments.

If the change genuinely has none, the job accepts an explicit justification
line in this description instead. The exact wording is in
docs/plan/03-documentation.md §Per merged task, and the job's own error message
prints it. It is deliberately NOT pre-printed here, for the same reason the
review heading below is not: an unedited template must fail, never pass
vacuously.

Also add this task's entry to docs/progress.md — one dated, PR-linked, plain-
language paragraph saying what a reader can do now that they could not before.
-->

## Progress log

- [x] `docs/progress.md` entry added for this task

## Notes for Reviewer

Specific files or decisions that benefit from human attention.

<!--
Independent review evidence — REQUIRED. The CI `Independent review pass` job
(OPS-04) fails any non-draft PR that lacks it. The heading is deliberately NOT
pre-printed below: the gate greps for it, so an unedited template must fail,
never pass vacuously. Add the evidence yourself, one of:

- Light tier (docs/config-only, no executable logic): add a section headed
  "Independent review" (as an H2, i.e. two #'s) right below this comment, with
  tier, reviewer, verdict, and one-line findings.
- Full tier (executable logic / security-relevant): post the full packet as a
  separate PR comment whose first line is the H2 heading
  "Independent review packet" (two #'s).

Reviewer must be a fresh-context agent; prefer a model family different from
the author's (escalated + cross-family for domain core / adapters / releases).
Brief: docs/plan/protocols/agentic-execution.md §Task Completion Checklist.
-->
