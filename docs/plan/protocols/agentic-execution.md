# Agentic Execution Protocol

> **Always loaded.** How agents pick up work, execute, and hand off.

## Agent Onboarding Sequence

When an agent (or human) starts a session:

1. **Sync before reading:** `git switch main && git pull --ff-only`, and check whether the previous session's PR merged (`gh pr list --state all --limit 3`). The tracker and handover on a stale branch may be outdated — reading them pre-sync caused a batch of stale-edit failures in the P0-11 session.
2. **Read [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)** → current phase, what's in progress, what's blocked
3. **Read [`HANDOVER.md`](../../HANDOVER.md)** → context from the previous session
4. **You already have:** principles ([`00-principles.md`](../00-principles.md)) and this protocol — they're always loaded
5. **Open the active phase file** identified in `IMPLEMENTATION.md` → load **only** that phase file
6. **Pick a task** from the phase file that has no unmet dependencies
7. **Create `.work/<TASK-ID>.md`** using [`templates/TASK.template.md`](../templates/TASK.template.md)
8. **Update `IMPLEMENTATION.md`** — move task to "In Progress" with your ID
9. **Branch from `main`:** `git checkout -b <task-id>-<slug>` (e.g. `p3-05-type-contract-checker`). Base on another branch **only** when your task depends on its unmerged output — and say so in the PR description.

## What NOT to Load

Loading extra files pollutes context and slows decisions. **Do not preemptively load:**

- ❌ Other phase files (load only the active phase)
- ❌ The roadmap ([`02-roadmap.md`](../02-roadmap.md)) unless doing cross-phase work
- ❌ Repo structure ([`01-repo-structure.md`](../01-repo-structure.md)) unless creating new files in an unfamiliar location
- ❌ Quality gates ([`quality-gates.md`](./quality-gates.md)) until ready to open a PR
- ❌ The full ADR directory — load specific ADRs only when referenced

## During Execution

- **Commit early, commit often.** Small, conventional-commit messages.
- **Plan/doc changes other tasks will depend on land first.** Ship them as their own small `docs(...)` PR to `main` before building on them — never buried inside a feature branch (see the P0-10 stacking gotcha in `docs/handovers/`).
- **Run tests before every commit.** `pnpm test` in the affected package.
- **If blocked:** document the blocker in `.work/<TASK-ID>.md` and update `IMPLEMENTATION.md` → "Blocked".
- **If a decision is needed** that affects other tasks or future work:
  - Write an ADR draft in `docs/adr/`
  - Flag in `IMPLEMENTATION.md` under "Open Decisions"
  - Pick up another task while waiting

## Permission-Prompt Descriptions

> Maintainer-approved wording (2026-06-12). A condensed version lives in root `CLAUDE.md`.

Write every Bash `description` so the maintainer can approve or deny from the prompt alone, without parsing the command itself. Two tiers:

- **Read-only / inspection** (status, diff, grep, test runs):
  one short clause — "Run vitest for @argus/testing (read-only check)".

- **State-changing** (installs, writes, push/merge, deletions, downloads, config edits): always three parts —
  `<action + exact target> — <why / task ID> — <scope & how to undo>`

  Examples:
  - "Add license-checker 25.0.1 as devDependency (P0-12 SPDX gate). Writes package.json + pnpm-lock.yaml; version published 14 days ago, name verified against npm. Undo: git restore both files."
  - "Push branch p0-12-license-gate to origin — publishes commits so the PR can be opened; main is untouched. Undo: delete the remote branch."
  - "Prettier --write on the 4 docs files touched by P0-11 — auto-format before commit so format:check passes. Formatting only, no content changes."

Rules:

- Never describe a command more vaguely than its real effect (no "update config" for something that deletes a file).
- If a command does two unrelated things, split it into two calls — each prompt should be exactly one decision.
- Anything needing more than ~2 sentences of justification gets explained in chat _before_ the call; the description then references that ("as discussed above: ...").

## Parallel Lanes (multi-agent)

Two writer agents may work simultaneously **only** when their declared file sets are disjoint. Rules:

- Each lane declares its file set up front in its `.work/<TASK-ID>.md` and sticks to it.
- Shared tracker files (`IMPLEMENTATION.md`, `HANDOVER.md`) are updated by whichever PR **merges first**; the other lane rebases before completing.
- Writer parallelism beyond disjoint doc/code lanes waits for the dogfooding gate (Phase 2+) — reviewer agents in fresh contexts are always allowed and encouraged.

## Task Completion Checklist

Before marking a task complete:

- [ ] All acceptance criteria from the task definition are met
- [ ] Tests pass locally (**root** `pnpm test` — turbo)
- [ ] Lint, type-check, and build clean at the **root** (`pnpm lint && pnpm typecheck && pnpm build`) — `pnpm --filter` runs bypass turbo's task graph and cannot catch graph-level failures (P1-02's workspace dependency cycle reached CI exactly that way)
- [ ] Coverage threshold met for new code (≥85% line, ≥80% branch)
- [ ] Dogfooding scan of Argus on itself shows no new issues (from Phase 2 onwards)
- [ ] **Documentation delta recorded** (see [`../03-documentation.md`](../03-documentation.md)) — for each stream the change touched: package `README.md` current · public exports carry TSDoc · user-facing change reflected in [`../../guide/`](../../guide/) · first-of-a-pattern gets a [`../../dev/`](../../dev/) recipe. If none apply, record **"no docs delta"** with a one-line reason.
- [ ] If architectural: ADR written or updated (the decision-rationale stream of [`../03-documentation.md`](../03-documentation.md))
- [ ] **Independent review pass done:** a fresh-context agent reviewed the diff against [`00-principles.md`](../00-principles.md) + [`quality-gates.md`](./quality-gates.md). Depth is tiered by diff risk (maintainer-approved 2026-07-04 — P0-12's review spent most of its budget re-verifying results the author had already documented):
  - **Light** — docs-only or config-only diffs with no executable logic: bugs-only findings + verdict, summarized in the PR description; no packet boilerplate.
  - **Full packet** — any diff with executable logic or security-relevant behavior: risk-ranked findings, acceptance-criteria mapping, and "what to manually verify in <10 min", attached to the PR.
  - **Reviewer brief, both tiers:** review the diff, not the repo; do **not** re-run verification the author documented (spot-check at most one); spend the budget on paths the author did **not** exercise (P0-12's one novel finding — the bundledDependencies blind spot — came from exactly there). Sonnet-class by default; escalate models only for high-risk diffs (domain core, adapter boundary, releases)
- [ ] PR opened using [`templates/PR.template.md`](../templates/PR.template.md)
- [ ] `IMPLEMENTATION.md` updated: task moved to Recently Completed
- [ ] `HANDOVER.md` rewritten for the next picker (use [`templates/HANDOVER.template.md`](../templates/HANDOVER.template.md))

## Handover Rotation

After every significant task (and **always** at phase boundaries):

1. **Copy** current `HANDOVER.md` to `docs/handovers/<phase>-<task-id>-handover.md` (snapshot)
2. **Rewrite** `HANDOVER.md` for the next picker using the template
3. **Commit** handover changes in the same PR as the task

This ensures continuity even when sessions are short or agents change.

**Budget: ~100 lines.** The next picker pays for every line each session — trim by moving detail into the archived snapshot, not by omitting gotchas.

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
| `CLAUDE.md` (repo root)            | ~30 lines  | Auto-loaded every session      |
| `IMPLEMENTATION.md`                | ~150 lines | Every session                  |
| `HANDOVER.md`                      | ~100 lines | Every session                  |
| `00-principles.md`                 | ~80 lines  | Every session                  |
| `agentic-execution.md` (this file) | ~150 lines | Every session                  |
| Active phase file                  | ~200 lines | Every session                  |
| `01-repo-structure.md`             | ~150 lines | When creating new files        |
| `02-roadmap.md`                    | ~50 lines  | When planning cross-phase work |
| `03-documentation.md`              | ~120 lines | When a task may produce docs   |
| `quality-gates.md`                 | ~60 lines  | Before opening a PR            |

**Steady-state load: ~660 lines** vs. ~1000+ lines for a monolithic plan. The savings compound across many sessions.
