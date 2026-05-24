# Agentic Execution Protocol

> **Always loaded.** How agents pick up work, execute, and hand off.

## Agent Onboarding Sequence

When an agent (or human) starts a session:

1. **Read [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)** → current phase, what's in progress, what's blocked
2. **Read [`HANDOVER.md`](../../HANDOVER.md)** → context from the previous session
3. **You already have:** principles ([`00-principles.md`](../00-principles.md)) and this protocol — they're always loaded
4. **Open the active phase file** identified in `IMPLEMENTATION.md` → load **only** that phase file
5. **Pick a task** from the phase file that has no unmet dependencies
6. **Create `.work/<TASK-ID>.md`** using [`templates/TASK.template.md`](../templates/TASK.template.md)
7. **Update `IMPLEMENTATION.md`** — move task to "In Progress" with your ID
8. **Branch:** `git checkout -b <task-id>-<slug>` (e.g. `p3-05-type-contract-checker`)

## What NOT to Load

Loading extra files pollutes context and slows decisions. **Do not preemptively load:**

- ❌ Other phase files (load only the active phase)
- ❌ The roadmap ([`02-roadmap.md`](../02-roadmap.md)) unless doing cross-phase work
- ❌ Repo structure ([`01-repo-structure.md`](../01-repo-structure.md)) unless creating new files in an unfamiliar location
- ❌ Quality gates ([`quality-gates.md`](./quality-gates.md)) until ready to open a PR
- ❌ The full ADR directory — load specific ADRs only when referenced

## During Execution

- **Commit early, commit often.** Small, conventional-commit messages.
- **Run tests before every commit.** `pnpm test` in the affected package.
- **If blocked:** document the blocker in `.work/<TASK-ID>.md` and update `IMPLEMENTATION.md` → "Blocked".
- **If a decision is needed** that affects other tasks or future work:
  - Write an ADR draft in `docs/adr/`
  - Flag in `IMPLEMENTATION.md` under "Open Decisions"
  - Pick up another task while waiting

## Task Completion Checklist

Before marking a task complete:

- [ ] All acceptance criteria from the task definition are met
- [ ] Tests pass locally (`pnpm test`)
- [ ] Lint and type-check clean (`pnpm lint && pnpm typecheck`)
- [ ] Coverage threshold met for new code (≥85% line, ≥80% branch)
- [ ] Dogfooding scan of Argus on itself shows no new issues (from Phase 2 onwards)
- [ ] If user-facing: documentation updated
- [ ] If architectural: ADR written or updated
- [ ] PR opened using [`templates/PR.template.md`](../templates/PR.template.md)
- [ ] `IMPLEMENTATION.md` updated: task moved to Recently Completed
- [ ] `HANDOVER.md` rewritten for the next picker (use [`templates/HANDOVER.template.md`](../templates/HANDOVER.template.md))

## Handover Rotation

After every significant task (and **always** at phase boundaries):

1. **Copy** current `HANDOVER.md` to `docs/handovers/<phase>-<task-id>-handover.md` (snapshot)
2. **Rewrite** `HANDOVER.md` for the next picker using the template
3. **Commit** handover changes in the same PR as the task

This ensures continuity even when sessions are short or agents change.

## Phase Transitions

When a phase is complete:

1. Verify every task is merged and the phase exit criteria are met
2. Update `IMPLEMENTATION.md`:
   - Phase status → ✅ Complete
   - Current phase → next phase
   - Active phase doc link → next phase file
3. Write a phase-completion handover (more comprehensive than a task handover)
4. Archive any phase-specific working notes

## Escalation Rules

An agent escalates to a human architect when:

- A decision affects more than one package's public API
- An ADR conflicts with a new requirement
- Tests fail in a way that suggests a design issue, not a bug
- Estimated effort exceeds 2× the original estimate
- A new external dependency is being considered
- A new risk emerges that wasn't in the risk register

Escalations are filed as "Open Decisions" in `IMPLEMENTATION.md` with the agent's recommendation. The agent then picks up another task while waiting.

## Context Window Management

The intent of this modular structure is to keep working context lean:

| Document                           | Size       | Load Frequency                 |
| ---------------------------------- | ---------- | ------------------------------ |
| `IMPLEMENTATION.md`                | ~150 lines | Every session                  |
| `HANDOVER.md`                      | ~80 lines  | Every session                  |
| `00-principles.md`                 | ~80 lines  | Every session                  |
| `agentic-execution.md` (this file) | ~150 lines | Every session                  |
| Active phase file                  | ~200 lines | Every session                  |
| `01-repo-structure.md`             | ~150 lines | When creating new files        |
| `02-roadmap.md`                    | ~50 lines  | When planning cross-phase work |
| `quality-gates.md`                 | ~60 lines  | Before opening a PR            |

**Steady-state load: ~660 lines** vs. ~1000+ lines for a monolithic plan. The savings compound across many sessions.
