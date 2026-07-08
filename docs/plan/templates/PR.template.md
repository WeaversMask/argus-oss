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

## Notes for Reviewer

Specific files or decisions that benefit from human attention.

## Independent review

<!--
Evidence of the mandatory independent review pass (protocol §Task Completion
Checklist). The CI `Independent review pass` job (OPS-04) requires the
`## Independent review` heading stem on a non-draft PR — remove this section
only if you post the packet as a comment instead.

- Light tier (docs/config-only, no executable logic): summarize the reviewer's
  bugs-only findings + verdict here, under this heading.
- Full tier (executable logic / security-relevant): post the full packet as a
  separate PR comment titled `## Independent review packet` and delete this
  section.

Reviewer must be a fresh-context agent; prefer a model family different from the
author's (escalated + cross-family for domain core / adapters / releases).
-->

- **Tier:** <light | full>
- **Reviewer:** <model / agent>
- **Verdict:** <approve | approve-with-nits | changes-requested>
- **Findings:** <one line, or "none">
