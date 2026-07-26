# Handover — Dogfooding wiring

**From:** claude-sonnet-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-25
**Phase:** P2 — MVP (4/6+4, dogfooding wiring done) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** Dogfooding wiring — repo-root `argus.yaml` + CI `dogfood` job — **PR pending merge**

---

## Context

CI now runs Argus on Argus: a repo-root `argus.yaml` (`ignore: ["**/tests/**", ".claude/**"]`) plus a new `dogfood` job in `.github/workflows/ci.yml` that runs `argus check . --format json` and fails the build on any violation, failure, or vacuous scan. `argus check .` at the repo root exits 0 with 0 violations across 135 tracked files.

Getting there was not just writing the ignore list. The first whole-repo scan (no config) found 191 violations; 153 were in `tests/` (test files, helpers, deliberately-invalid rule fixtures — exactly the maintainer's ruling), but **38 were real violations on production source**: missing JSDoc on 31 exports across `core/domain`, `ast`, `rules-builtin`; oversized functions in `config/loader.ts` and `rules-builtin`'s `max-nesting-depth` rule; a nesting violation in `scripts/check-licenses.mjs`; and four violations on one function — `rule-engine`'s `Engine.runSync` (complexity 20, 156 lines, nesting 5, file 309 lines). This repo's own precedent (P2-02, P2-04: self-scan finds something real, fix it in the same task) said fix, not ignore — so all 38 got fixed before the CI job was wired, meaning the gate starts at zero rather than red.

## What P2-05/P2-06 inherit

1. **The dogfood gate is real, not cosmetic.** It requires `filesScanned > 100` (not just exit 0) because a scan that matches nothing is a _successful_ zero-file scan by P2-04's own design — exit 0 alone can't tell "135 clean files" from "the ignore list ate everything". If you touch `argus.yaml`'s `ignore:` or the discovery path, re-run `node apps/cli/bin/argus.mjs check . --format json` locally and check `.summary.filesScanned` before pushing.
2. **`rule-engine/src/engine.ts` is now a thin class; the dispatch/reporting machinery lives in `handlers.ts`.** `Engine.runSync` = compile → walk → build, ~11 lines. If you touch rule execution, read `handlers.ts`'s `registerListeners`/`walkAndCollect`/`buildViolations` — the walk itself (`walk()` from `./walk.js`) is untouched and must stay iterative (50k-deep test in `tests/perf/`).
3. **neverthrow gotcha:** returning an `Err<T1, E>` from a function typed `Result<T2, E>` does not typecheck, even though at runtime an `Err` only carries `E`. Rewrap with `err(x.error)` at every such boundary — `engine.ts`/`handlers.ts` have four examples now.

## Gotchas this task discovered

1. **A stray local git worktree can pollute a self-scan without anyone noticing.** `.claude/worktrees/<name>/` (a Claude Code harness artifact, not repo content) added 13 extra files to a local `argus check .` — invisible in CI's fresh checkout, but confusing locally and a real gap in the ignore list. Now excluded (`.claude/**` in `argus.yaml`, `.claude/` in `.gitignore`). If a local self-scan count looks off, check for stray worktrees/dirs before trusting the number.
2. **The CI exit-code-trust pattern has a hole the P2-04 review's own jq lesson didn't cover:** avoiding the pipe fixes "did the scan run," not "did the scan find anything." Both checks are needed. `jq -e '.summary.filesScanned > N' report.json > /dev/null` as its own step, after redirecting (never piping) the scan to a file.
3. **TypeScript does not check `readonly` on index-signature types for assignability** — a function typed to take `Record<string, X>` silently accepts a `Readonly<Record<string, X>>` argument with no error, so a refactor can widen away a domain type's readonly-ness without any tooling catching it. Match the domain type exactly, don't accept a wider one just because it happens to compile.
4. **A floating JSDoc block between imports and the first export attaches to nothing** — no doc tool associates it with the following export. A file-level comment either goes above the imports as a plain `//` block, or gets folded into the first export's doc.

## Evergreen (carried forward)

- Root gates before every push (`pnpm lint && typecheck && build && test`); filtered runs bypass turbo's graph. `pnpm boundaries` too.
- New package? The checklist: root `vitest.config.ts` projects entry · per-package `*-public-entry-only` cruiser rule **+ negative test** · `Dockerfile.dev` mkdir + compose named volume · README · `pnpm license-check` / `pnpm notices`.
- prettier reflows Markdown tables — `pnpm exec prettier --write <files>` before staging.
- `gh pr edit` fails here (projectCards GraphQL) — PATCH via `gh api`.
- The CI review-pass gate reads the PR body frozen at trigger time — post review evidence as a comment and re-run the job.
- `$?` after a pipe is the pipe's exit code — verify exit codes with a redirect, not a pipe.
- Never `--no-verify`; scoped `SKIP=<gate>` with written justification only.

## State of the system

- ✅ Tests: **656 passing** (63 files), 0 failing. Aggregate coverage 98.09% lines / 94.59% branches
- ✅ Lint, typecheck, build, boundaries, format:check clean at root
- ✅ Self-scan: `argus check .` (repo root) → **0 violations, 0 failures, 135 files**
- ✅ License gate green (569 packages, 4 exceptions); notices regenerated (no diff — already current)
- ✅ Merged since the last handover: **#37** (P2-04)
- ✅ Independent review (Opus, cross-family + escalated for the rule-engine touch): APPROVE WITH CHANGES — 1 HIGH (vacuous-scan gate hole) + 4 MEDIUM + 6 LOW, all addressed in-branch (fix commit on top of the feature commit)

## Recommended next steps

Pick up **P2-06** (auto-fix engine, riskiest of the phase) or **P2-05** (diff mode) — both unblocked, no hard ordering between them. Either way:

1. Re-run `node apps/cli/bin/argus.mjs check .` before pushing — the dogfood gate is real now, not aspirational.
2. If P2-06 lands: `argus fix` will be the CLI's first mutating command; round-trip safety needs the same obsessiveness as the phase doc says. If P2-05 lands: `--diff main` extraction is new territory (`packages/orchestrator/`, a package that doesn't exist yet).

## Open decisions / scope calls

- **Ratchet vs. absolute zero.** `quality-gates.md`'s Dogfooding Gate section describes an eventual ratchet (existing-violation count can't increase); the actual gate is absolute-zero, which trivially satisfies that but isn't the same mechanism. Revisit only if the zero bar is ever knowingly relaxed.
- **`dogfood` is not yet a branch-protection required check** — same maintainer admin step as `boundaries`/`license`/`review-gate` (P0-03 bucket).
- D-1, D-5, D-6, D-8 unchanged — see IMPLEMENTATION.md. D-8 (CLI packaging) is deferred past Phase 2 by the maintainer.

## Sign-off

Argus now enforces its own quality bar in CI, at zero violations, on its own hot-path code — not just the parts it was easy to keep clean. P2-05 and P2-06 are both ready to pick up.

— claude-sonnet-5
