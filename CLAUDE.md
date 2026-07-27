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

## Background processes (hard rule — a leak here is invisible)

Commands run through the maintainer's **zsh**, with **no controlling terminal**. Anything you background and fail to kill is reparented to `launchd` and survives the session, the terminal, and you. A spin loop leaks no memory and touches no disk, so the only symptom is heat — it can burn a machine for hours before anyone looks. This has happened once (2026-07-27: eight orphaned spin loops, ~3.5h).

- **Bound it, don't just plan to kill it.** Every backgrounded command must die on its own if cleanup fails. Never background an unbounded `while :; do :; done` — a process stoppable only by an explicit kill turns one failed cleanup into a permanent leak. **macOS ships no `timeout`** (no `gtimeout` either), so self-bound in the loop itself: `/bin/sh -c 'while [ $SECONDS -lt 20 ]; do :; done' &`.
- **Capture `$!` immediately after each `&`. Never `$(jobs -p)`.** zsh's command-substitution subshell starts with an **empty job table**, so `PIDS=$(jobs -p)` silently yields `""` — and the bare `kill` that follows fails with a usage error, not a kill. (This is the exact 2026-07-27 bug; the idiom is copied from bash, where it happens to work.)
- **Clean up in a `trap … EXIT`**, so an early failure or non-zero exit still tears down what you started.
- **Never silence or unconditionally narrate a cleanup.** No `kill … 2>/dev/null` followed by `echo "stopped"` — that prints success at the exact moment it failed, which is what stopped the last leak from being caught. Kill, then **verify** (`ps -p "$PID"`) and report what you actually observed.
- **Prefer not backgrounding at all.** Most "run under load" experiments can be replaced by measuring the thing directly, or by `run_in_background: true` on the Bash tool, which the harness tracks and can stop.

Verified working under zsh on macOS — run it as written rather than adapting a bash idiom from memory:

```bash
PIDS=(); trap 'for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done' EXIT
for _ in 1 2 3; do /bin/sh -c 'while [ $SECONDS -lt 20 ]; do :; done' & PIDS+=($!); done

# … measure …

for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done
LEAKED=0
for p in "${PIDS[@]}"; do ps -p "$p" >/dev/null 2>&1 && { echo "STILL RUNNING: $p"; LEAKED=1; }; done
[ "$LEAKED" -eq 0 ] && echo "verified: no load generators left"
```

## Best practices (hold these at all times)

- **Sign-off gates run at the repo ROOT before every push:** `pnpm lint && pnpm typecheck && pnpm build && pnpm test`. `pnpm --filter <pkg>` runs bypass turbo's task graph and miss whole-graph failures (P1-02: a workspace dependency cycle reached CI exactly this way). Filtered runs are for iteration only, never sign-off.
- **Independent review pass before requesting merge — never skip it.** Fresh-context agent, tiered by diff risk: light for docs/config-only, full packet for executable logic; Sonnet-class by default, **escalated model for domain core / adapter boundaries / releases**. Brief and packet format: [agentic-execution.md §Task Completion Checklist](docs/plan/protocols/agentic-execution.md).
- **Secret scanning is layered — keep every layer intact:** pre-commit scans staged content, pre-push scans the outgoing range, CI scans full history. `SKIP=gitleaks` at any local layer requires written justification ([SECURITY-NOTES.md](docs/SECURITY-NOTES.md)).
- Work through the full [Task Completion Checklist](docs/plan/protocols/agentic-execution.md) before calling a task done — acceptance criteria, gates, review pass, tracker + handover. A task without its checklist is not complete.

## Evergreen gotchas

- Prettier reflows Markdown tables — run `pnpm exec prettier --write <files>` before staging or pre-commit fails.
- Never `--no-verify`. Use scoped `SKIP=<gate>` with written justification ([SECURITY-NOTES.md](docs/SECURITY-NOTES.md)).
- Conventional commits only: `feat|fix|chore|refactor|docs|test`.
- Documentation is captured progressively — every task records a doc delta (or an explicit "no docs delta"). Standard: [docs/plan/03-documentation.md](docs/plan/03-documentation.md).
- One task = one branch = one PR. Branch from `main`; plan/doc changes other tasks depend on land first as their own small PR.
- Agents may push branches and open PRs. **Agents never merge — the maintainer does.**
- **Going public is maintainer-only, voluntary, unscheduled — never agentic.** Agents never change repo visibility or create public repos. The retired `WeaversMask/argus` repo is a frozen pre-scrub archive — never push there, never make it public. Procedure: [go-public-runbook](docs/go-public-runbook.md).
- Public identity is `WeaversMask <131781531+WeaversMask@users.noreply.github.com>` — enforced via repo-local git config. Never commit here with the global (personal) email; history was scrubbed of it on 2026-07-04.
