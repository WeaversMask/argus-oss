# Handover — <Phase or Task ID>

**From:** <name|agent-id>
**To:** <name|agent-id|"next picker">
**Date:** YYYY-MM-DD
**Phase:** P<N> — <name>
**Last task completed:** <TASK-ID> — <title>

---

## Context

Two paragraphs maximum. Where we are, what was just finished, what the next agent needs to know to be productive immediately. Be specific. The next agent shouldn't need to dig.

---

## What I Did

- List the meaningful changes
- Include any non-obvious design decisions
- Reference PRs by number

PRs merged in this session:

- #XXX — feat(...)
- #XXX — chore(...)

---

## What I Did NOT Do (Deferred)

> Critical section. Anything you considered and chose not to do, anything left incomplete, anything you noticed but is out of scope.

- **Item:** brief description. Reason: <why>. Tracked as: <task-id|decision-id|TODO with location>.

---

## Gotchas & Surprises

> The most valuable section. Document anything that took longer than expected, any sharp edges you hit, any non-obvious behaviour of libraries or tools.

1. **<Surprise title>.** What you discovered, where it lives, how to handle it.
2. **<Another>.**

---

## State of the System

- ✅ Tests: X passing, Y failing, Z skipped
- ✅ Coverage: X.X% line / X.X% branch
- ✅ CI: green/red on main
- ⚠️ Lint: X warnings — explain if intentional
- ✅ Dogfooding scan of self: X errors / Y warnings / Z info

---

## Recommended Next Steps

Pick up **<NEXT-TASK-ID>** in this order:

1. Read <specific file>
2. Read <specific file> — note <specific thing>
3. Check <test fixtures or similar>
4. Build the <thing>; the test harness is ready

Estimated effort: **<S/M/L/XL>**.

---

## Open Questions for the Next Agent

> Things you're uncertain about that the next agent should think about before extending. Not blockers — blockers go in IMPLEMENTATION.md → Open Decisions.

- Question?

---

## Files Touched This Session

```
path/to/file                   [created|modified|deleted]
```

---

## Sign-off

One sentence confirming the codebase is in a working state and the next agent can start immediately.

— <signature>
