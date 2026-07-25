# Handover — P2-03 (console output formatter)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-25
**Phase:** P2 — MVP (3/6+4) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-03 — colour console formatter — **PR pending merge**

---

## Context

`argus check` now looks like a real tool: findings are colour-coded by severity, grouped under a bold file header, one per line as `line:col  severity  message  rule-id`, with a counts summary. P2-02's `src/format.ts` placeholder is gone — replaced by `src/report.ts` (the shape), `src/formatters/console.ts` (layout), and `src/formatters/colour.ts` (the colour decision + palette).

Nothing about the pipeline, the exit-code contract, or the failures reporting changed. **P2-04 (JSON output) is the next task and this diff was built for it:** put `formatters/json.ts` beside `console.ts`, serialise the same `ScanReport`, and note that `@argus/api-contracts` still does not exist — creating it is part of P2-04 (full new-package checklist; `zod` is already vetted from P1-05).

## What P2-04 inherits

1. **`ScanReport` (`src/report.ts`) is the formatter contract** — `violations`, `failures`, `filesScanned`. Keep `failures` in the JSON output too: a formatter that drops it lets a partial scan read as clean, and the exit-code contract (`2` for any unanalysable file) depends on it being honest.
2. **Choosing a formatter is not wired yet.** There is no `--format` flag — `check` calls `formatConsoleReport` directly (`src/check.ts`). P2-04 adds the flag; `run(argv, io)` in `src/main.ts` is still the seam, and `--no-color` is the worked example of adding one (declared on the `check` subcommand, read as `options.color`, passed into `runCheck` as `CheckOptions`).
3. **JSON must not be coloured, ever** — including when `FORCE_COLOR=1`. `shouldUseColour` is only consulted by the console formatter; keep it that way rather than adding a JSON-specific exception inside it.
4. **`CliIO` now carries `env` and `isTTY`.** Read ambient state from there, never from `process` inside a command — that is what keeps `src/cli.ts` branch-free and the decision unit-testable. `captureIO(cwd, { env, isTTY })` in `tests/support.ts` defaults to an empty env and a non-terminal stdout, so no test inherits your shell.

## Design decisions worth not re-litigating

- **Base SGR colours only** (cyan `info`, yellow `warning`, red `error`, bold-red `critical`; bold paths, dim metadata, green clean line). Terminals remap those to their own theme, so the output reads on light **and** dark backgrounds; 256-colour/truecolor values look right on exactly one and wrong on the other.
- **Colour is decoration, never information.** The severity word is always printed. A test asserts the coloured render equals the plain one once escapes are stripped — that invariant is worth keeping as new output lands.
- **`stylesFor(colour)` returns roles that are either ANSI wrappers or the identity function**, so layout code contains no `if (colour)` at all. This is why `src/formatters/` sits at 100% branch coverage.
- **Padding is applied to visible text before styling.** Escapes have zero width; pad after styling and every column silently misaligns.

## Gotchas this task discovered

1. **Writing a literal ESC character into source is easy to do by accident** and invisible in review. `colour.ts` uses the `\u001B` escape; the tests build it with `String.fromCharCode(27)`. Check with `cat -v` if you touch either.
2. **`FORCE_COLOR=0` means force _off_.** My first version only treated it as "not a force-on" and let it fall through to the TTY check, so at a terminal it did nothing — the independent review caught it. The ladder is now `--no-color` → `FORCE_COLOR` (set: `0` off, else on) → `NO_COLOR` (non-empty) → `TERM=dumb` → `isTTY`, matching chalk/supports-color/Node's own tty detection.
3. **Subprocess tests inherit your shell's colour variables.** `tests/bin.test.ts` now pins `NO_COLOR`/`FORCE_COLOR` to `""` (empty reads as unset) in the child env, and it is the **only** evidence for the `env`/`isTTY` wiring in `src/cli.ts`, which is excluded from instrumented coverage. Do not delete those tests without removing the exclusion.
4. **commander's `--no-color` on a subcommand is positional** — `argus check . --no-color` works, `argus --no-color check .` is an unknown-option error (exit 2). Documented in the guide; a future global-flag pass could change it.
5. **`$?` after a pipe is the pipe's exit code** (carried forward from P2-02 — verify exit codes with a redirect, not a pipe).

## Evergreen (carried forward)

- Root gates before every push (`pnpm lint && typecheck && build && test`); filtered runs bypass turbo's graph. `pnpm boundaries` too.
- prettier reflows Markdown tables — `pnpm exec prettier --write <files>` before staging.
- commitlint header ≤100 chars; a failed commit leaves files staged.
- `gh pr edit` fails here (projectCards GraphQL) — PATCH via `gh api`.
- The CI review-pass gate reads the PR body frozen at trigger time — post review evidence as a comment and re-run the job.
- **Bash CWD drifts** when a `cd` fails mid-session — prefer absolute paths.
- Never `--no-verify`; scoped `SKIP=<gate>` with written justification only.

## State of the system

- ✅ Tests: **598 passing** (60 files), 0 failing. Aggregate coverage 98.0% lines / 94.4% branches
- ✅ Lint, typecheck, build, boundaries clean at root; `@argus/cli` 94.9/85.3, `src/formatters/` 100/100
- ✅ Self-scan: `argus check apps/cli/src` → 0 violations (15 files)
- ✅ Merged since the last handover: **#31** (P2-02), **#32** (postcss override), **#34** (`fix(ops)`) — the last one closed P2-02's filed cruiser blind spot with a `no-unresolvable` rule and added the fifth Coverage Exception category to `quality-gates.md`. That gotcha is **retired**, not carried forward.

## Open decisions / scope calls

- **Test-helper JSDoc policy** — still needs a maintainer call during dogfooding wiring (unchanged from P2-02).
- **CLI packaging**: the loader wrapper vs. a build step, forced whenever a global install matters (interacts with D-5).
- **A `--format` flag design** is P2-04's call: `--format json` vs `--json`, and whether `--no-color` should become a global flag at the same time.
- D-1, D-5, D-6 unchanged — see IMPLEMENTATION.md.

## Sign-off

Argus's own output is now the first thing a stranger will judge it by, and it is honest under every colour setting — including monochrome, where it loses nothing. Point P2-04 at the same `ScanReport` and give it a machine-readable voice.

— claude-opus-5
