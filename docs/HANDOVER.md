# Handover — P2-04 (JSON output formatter)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-25
**Phase:** P2 — MVP (4/6+4) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-04 — `argus check --format json` + `@argus/api-contracts` — **PR pending merge**

---

## Context

`argus check` now speaks to machines as well as people: `--format json` emits a single document on stdout, validated against a zod schema in the **new `@argus/api-contracts` package**. That package is the first piece of the wire format the API server (Phase 6) and web UI (Phase 7) will share, which is why it holds shapes and nothing else.

The two remaining P2 code tasks are **P2-05** (diff mode) and **P2-06** (auto-fix, the risky one), and the phase-exit **dogfooding wiring** is now the most valuable next move — a CI job can consume `--format json` instead of scraping text, and the maintainer has already ruled the hardest half of the `ignore:` design (test files are excluded; do not re-ask).

## What P2-05/P2-06 and the dogfooding task inherit

1. **Adding a format is now a documented, one-file operation** — [`docs/dev/adding-a-report-formatter.md`](./dev/adding-a-report-formatter.md). `src/formatters/render.ts` owns `OUTPUT_FORMATS`; commander derives `--format`'s `.choices()` from it, so an unknown value is a usage error (exit 2) for free. Adding a flag is still `run(argv, io)` → `CheckOptions`, with `--no-color` and `--format` as the two worked examples.
2. **The contract package deliberately does not depend on `@argus/core`.** A consumer of the wire format has no domain layer to import. The vocabularies are kept in step by a test where the mapping lives (`apps/cli/tests/formatters/json.test.ts` asserts core's `SEVERITIES` equals the schema's enum). If you find yourself importing core into `api-contracts`, that is the decision you are reversing.
3. **stdout purity is a contract, not a courtesy.** Diagnostics go to stderr; a scan that matches no files now emits a valid zero-file document instead of exiting early. Anything you add to `check` must keep stdout parseable under `--format json`.
4. **`ScanReport` (`src/report.ts`) is still the one shape every formatter renders.** `--diff` (P2-05) filters what goes into it; it should not grow a second report type.

## Gotchas this task discovered

1. **commander subcommands built standalone lose the program's settings.** Extracting `check` into `new Command("check")` + `program.addCommand(...)` silently dropped `exitOverride`/`configureOutput`, so a bad `--format` value tried to call `process.exit` instead of returning exit 2. `program.command("check")` copies inherited settings; the extraction now takes the program as a parameter. The `--format` usage test is what caught it — keep that kind of test whenever a command moves.
2. **Dogfooding found the regression before review did.** The new flag pushed `buildProgram` past `quality/max-function-length` (53 lines). Run `node apps/cli/bin/argus.mjs check apps/cli/src` before you push anything that touches the CLI — it is 2 seconds and it fires on your own code.
3. **`expect.any(String)` inside `toEqual` trips `@typescript-eslint/no-unsafe-assignment`** at this lint strictness. Assert the concrete value (test-built ids are derivable) or pull the field out first.
4. **`THIRD-PARTY-NOTICES` was stale on `main`** — still `postcss 8.5.16` after #32's override to 8.5.18. Regenerated here. A dependency _override_ changes notices even though no dependency was added; `pnpm notices` after any override edit.
5. **Zod 4 idiom:** `z.strictObject(...)` and `z.int()` (not `z.number().int()`), matching `@argus/config`. `.refine()` on a strict object still nests fine inside another schema.
6. **A strict schema is a producer-side guarantee, not a consumer-side one.** The review caught the contradiction: with strict objects, "adding an optional field is backwards compatible" is false for anyone who _validates_ with the schema. `@argus/api-contracts` is now explicitly producer-conformance; a consumer that must survive additions checks `contractVersion` and parses permissively. Worth remembering before Phase 6 wires an HTTP client to it.
7. **A rule that lives only in prose is not a rule.** "api-contracts depends on zod, never on core" was stated in four documents and enforced nowhere; `api-contracts-only-zod` now enforces it. When a PR describes a decision as load-bearing, ask what fails if someone reverses it.

## Evergreen (carried forward)

- Root gates before every push (`pnpm lint && typecheck && build && test`); filtered runs bypass turbo's graph. `pnpm boundaries` too.
- New package? The checklist: root `vitest.config.ts` projects entry · per-package `*-public-entry-only` cruiser rule **+ negative test** · `Dockerfile.dev` mkdir + compose named volume · README · `pnpm license-check` / `pnpm notices`.
- prettier reflows Markdown tables — `pnpm exec prettier --write <files>` before staging.
- commitlint header ≤100 chars; a failed commit leaves files staged.
- `gh pr edit` fails here (projectCards GraphQL) — PATCH via `gh api`.
- The CI review-pass gate reads the PR body frozen at trigger time — post review evidence as a comment and re-run the job.
- `$?` after a pipe is the pipe's exit code — verify exit codes with a redirect, not a pipe.
- **Bash CWD drifts** when a `cd` fails mid-session — prefer absolute paths.
- Never `--no-verify`; scoped `SKIP=<gate>` with written justification only.

## State of the system

- ✅ Tests: **656 passing** (63 files), 0 failing. Aggregate coverage 98.08% lines / 94.53% branches
- ✅ Lint, typecheck, build, boundaries clean at root; `@argus/cli` 94.9/86.2, `@argus/api-contracts` 100%
- ✅ Self-scan: `argus check apps/cli/src` and `argus check packages/api-contracts/src` → 0 violations
- ✅ License gate green (569 packages, 4 exceptions); notices regenerated
- ✅ Merged since the last handover: **#35** (P2-03), **#36** (D-8 filed as deferred)

## Open decisions / scope calls

- **Dogfooding `ignore:` list** — test files are ruled out by the maintainer (2026-07-25); fixtures are obvious. What remains is writing it down in a repo-root `argus.yaml` and wiring the CI job.
- **Global vs. subcommand flags.** `--no-color` and `--format` both belong to `check`, so they must follow the command name. A global-flag pass is still unclaimed work.
- D-1, D-5, D-6, D-8 unchanged — see IMPLEMENTATION.md. D-8 (CLI packaging) is deferred past Phase 2 by the maintainer.

## Sign-off

Argus's findings are now a data structure with a published schema, not just text on a terminal — everything downstream in the roadmap consumes that. Point the next task at the dogfooding wiring and the CI job can read it directly.

— claude-opus-5
