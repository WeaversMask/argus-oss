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

## Best practices (hold these at all times)

- **Sign-off gates run at the repo ROOT before every push:** `pnpm lint && pnpm typecheck && pnpm build && pnpm test`. `pnpm --filter <pkg>` runs bypass turbo's task graph and miss whole-graph failures (P1-02: a workspace dependency cycle reached CI exactly this way). Filtered runs are for iteration only, never sign-off.
- **Independent review pass before requesting merge — never skip it.** Fresh-context agent, tiered by diff risk: light for docs/config-only, full packet for executable logic; Sonnet-class by default, **escalated model for domain core / adapter boundaries / releases**. Brief and packet format: [agentic-execution.md §Task Completion Checklist](docs/plan/protocols/agentic-execution.md).
- **Secret scanning is layered — keep every layer intact:** pre-commit scans staged content, pre-push scans the outgoing range, CI scans full history. `SKIP=gitleaks` at any local layer requires written justification ([SECURITY-NOTES.md](docs/SECURITY-NOTES.md)).
- Work through the full [Task Completion Checklist](docs/plan/protocols/agentic-execution.md) before calling a task done — acceptance criteria, gates, review pass, tracker + handover. A task without its checklist is not complete.

## Evergreen gotchas

- Prettier reflows Markdown tables — run `pnpm exec prettier --write <files>` before staging or pre-commit fails.
- Never `--no-verify`. Use scoped `SKIP=<gate>` with written justification ([SECURITY-NOTES.md](docs/SECURITY-NOTES.md)).
- Conventional commits only: `feat|fix|chore|refactor|docs|test`.
- One task = one branch = one PR. Branch from `main`; plan/doc changes other tasks depend on land first as their own small PR.
- Agents may push branches and open PRs. **Agents never merge — the maintainer does.**
- **Going public is maintainer-only, voluntary, unscheduled — never agentic.** Agents never change repo visibility or create public repos. The retired `WeaversMask/argus` repo is a frozen pre-scrub archive — never push there, never make it public. Procedure: [go-public-runbook](docs/go-public-runbook.md).
- Public identity is `WeaversMask <131781531+WeaversMask@users.noreply.github.com>` — enforced via repo-local git config. Never commit here with the global (personal) email; history was scrubbed of it on 2026-07-04.
