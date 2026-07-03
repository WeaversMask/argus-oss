# CLAUDE.md — Argus agent onboarding

**Start here every session:** sync first — `git switch main && git pull --ff-only` (a stale branch carries a stale tracker/handover) — then read [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) (current state, Up Next), then [docs/HANDOVER.md](docs/HANDOVER.md) (previous session's context), then the active phase file IMPLEMENTATION.md names. Protocol: [agentic-execution.md](docs/plan/protocols/agentic-execution.md) · Principles: [00-principles.md](docs/plan/00-principles.md). Load nothing else preemptively.

## Context budget (user-enforced — do not bypass)

- At **~50% context used**: finish the current commit, update `HANDOVER.md`, stop cleanly.
- **Never start new work past 70%** — rotate the handover instead (archive + rewrite, see protocol).
- Prefer tasks that fit one session. Broad searches go through a search subagent (e.g. Explore) so only conclusions enter this context.

## Permission-prompt descriptions

Write every Bash `description` so the maintainer can decide from the prompt alone:

- **Read-only** commands: one short clause.
- **State-changing** commands (installs, writes, push, deletions, downloads, config edits): `action + exact target — why / task ID — scope & how to undo`.
- Never vaguer than the real effect. Split compound commands so each prompt is one decision. Justification longer than ~2 sentences goes in chat _before_ the call.

Full policy with examples: [agentic-execution.md §Permission-Prompt Descriptions](docs/plan/protocols/agentic-execution.md).

## Evergreen gotchas

- Prettier reflows Markdown tables — run `pnpm exec prettier --write <files>` before staging or pre-commit fails.
- Never `--no-verify`. Use scoped `SKIP=<gate>` with written justification ([SECURITY-NOTES.md](docs/SECURITY-NOTES.md)).
- Conventional commits only: `feat|fix|chore|refactor|docs|test`.
- One task = one branch = one PR. Branch from `main`; plan/doc changes other tasks depend on land first as their own small PR.
- Agents may push branches and open PRs. **Agents never merge — the maintainer does.**
