# Handover — Auto-fix engine (`argus fix`)

**From:** claude-sonnet-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-26
**Phase:** P2 — MVP (5/6+4) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-06 — Auto-fix engine — **PR [#39](https://github.com/WeaversMask/argus-oss/pull/39) open, review done and addressed, awaiting maintainer merge**

---

## Context

`argus fix [path] [--dry-run]` exists: the CLI's first mutating command. Of the ten built-in rules, only `style/import-order` is fixable — investigated, not assumed, before scoping the task down to it (the other nine need a semantic judgement call no mechanical transform can safely make). The fixer proves safety before offering an edit — it declines on four distinct shapes (interior comment, comment abutting the block's own first/last line, side-effect-only import, two imports sharing a line) rather than guessing; `apps/cli` splices accepted fixes in via `magic-string`, then runs the result through a new `@argus/adapters-prettier` package as a finishing pass. Full rationale: [ADR-0006](./adr/0006-autofix-representation-and-safety.md).

**The independent review (Opus, cross-family + escalated) returned REQUEST CHANGES with 3 HIGH findings, every one reproduced — including a silent file corruption.** All 12 findings are fixed in-branch and re-verified; PR [#39](https://github.com/WeaversMask/argus-oss/pull/39) is open with the packet posted as a comment. Nothing is left for the next picker except the maintainer's merge decision. The findings are worth reading before writing a second fixer — see "Gotchas".

## What I Did

- **`Fix` domain type** (`packages/core/src/domain/fix.ts`) threaded additively: `RuleReport.fix?` → `CapturedReport.fix?` → `Violation.fix?`. No `RuleRunnerPort` signature change.
- **New `FormatterPort`** (core) + **new `@argus/adapters-prettier` package** (`packages/adapters/prettier/`) — `PrettierFormatter` resolves the _target project's_ Prettier config relative to its own root, never `process.cwd()`.
- **`style/import-order` fixer** (`packages/rules-builtin/src/style/import-order.ts`) — whole-block reorder, gap-preserving (reconstructs blank lines between reordered imports from line numbers, since `AstNode` has no raw offsets), safety-gated as above.
- **`apps/cli`**: `scan.ts` extracted from `check.ts` (shared config→discover→parse→engine pipeline, and since the review the carrier of each file's exact on-disk source); new `apply-fixes.ts` (magic-string splice, dedupes/conflict-resolves), `position-offset.ts` (`LineIndex`, position→offset bridge, round-tripped against a real parsed tree in tests), `diff.ts` (unified diff for `--dry-run`, verified against real `git apply`), `fix.ts` (`runFix` → `planFixes`/`commitFixes`/`countRemaining`, two-phase so nothing is written until every edit is computed).
- **`pnpm-workspace.yaml`** gains `"packages/adapters/*"`. Two pre-existing dependency-cruiser patterns assumed every package was one segment deep (`no-cross-package-deep-imports`'s backstop, the coverage/dist/.turbo excludes) — both fixed with a companion pattern once the new nested package exposed the assumption; both new/changed rules (`rule-engine-never-imports-adapters`, `adapters-prettier-public-entry-only`) verified by temporarily reintroducing then reverting a violating import.
- **Cruiser config split**: the rule list crossed 300 lines and moved to `dependency-cruiser-rules.cjs` (genuine modularisation — it only grows as Phase 4's adapters arrive, not a threshold dodge). Needed `@typescript-eslint/no-require-imports` turned off for `*.cjs` in `eslint.config.mjs` — the whole point of that extension, never previously exercised by a same-directory `require()`.
- Docs: ADR-0006, `docs/guide/cli.md` (`fix` section + exit-code table), `docs/guide/rules.md` (fixable marker), `docs/dev/adding-a-rule.md` (new "Offering a fix" section), `docs/architecture.md`, and the READMEs for `core`, `rule-engine`, `rules-builtin`, `cli`, and the new adapter package.

- **Review-fix pass** (separate commit): all 12 findings from the #39 packet — see Gotchas 0, 7, 8, 9 for the ones with lasting lessons.

PRs merged in this session: none — #39 is open and awaiting the maintainer.

## What I Did NOT Do (Deferred)

- **P2-05 (diff mode)** — untouched, still top of the real backlog once this merges.
- **A second fixable rule** — only `import-order` this task, deliberately (see ADR-0006). The fix engine's conflict-resolution machinery is tested but not yet exercised by a second real fixer.
- **`argus explain` does not say whether a rule is fixable** — noted as a gap in `docs/guide/cli.md`, not fixed. Small, non-blocking follow-up if anyone wants it.
- **`fix --format json`** — no machine-readable output for `fix`, only `check` has one. Not asked for by the phase spec; flag if a consumer needs it.

## Gotchas & Surprises

0. **`parsed.root.text` is NOT the file's source.** Tree-sitter's `program` node starts at the _first token_, so any file beginning with a blank line, space, tab, or BOM yields a root whose text is a truncated copy — while every `Position` stays absolute. Splicing against it shifts every offset. This shipped in my first pass and the reviewer reproduced it as a **silent file corruption**: comment deleted, import duplicated, exit `0`, violation still present. `ParseOutcome.sources` now carries the bytes read from disk, and `parseAll` is its single producer. **If you write anything else that edits files, take the source from there, never from the AST.** The tell that should have caught it earlier: `position-offset.test.ts` round-trips against `source` — the unit test used the correct base while production did not, so a green suite proved nothing about the real path.

1. **A rule never sees raw source or byte offsets** (`AstNode` — P1-03 scope limit, deliberately not revisited). A fix's `Position` → `magic-string` offset conversion has to happen in `apps/cli`, not the rule; `position-offset.ts`'s `LineIndex` is that bridge, and it's worth reading before writing a second fixer.
2. **Multiple violations can share one fix.** `import-order`'s whole-block reorder resolves every out-of-order import in a file with the _same_ fix object — `apply-fixes.ts` de-dupes by structural equality (not reference: the domain factory rebuilds a fresh frozen copy every time, so reference equality never survives `violation()`).
3. **Nested workspace packages break single-segment assumptions.** `packages/adapters/prettier/` (two segments deep) silently defeated two existing cruiser patterns that assumed `packages/<name>/...`. If a future package nests similarly, check `dependency-cruiser-rules.cjs`'s backstop and `.dependency-cruiser.cjs`'s `exclude.path` for the same class of bug.
4. **A `.cjs` file's `require()` was banned by ESLint** even though the same config block declares `require` a real global — `@typescript-eslint/no-require-imports` needed an explicit override for `**/*.cjs`. Fixed once in `eslint.config.mjs`; applies to any future `.cjs` file that needs to require a sibling.
5. **A tiny new package can fail its own coverage threshold on one defensive branch.** `@argus/adapters-prettier`'s `message()` helper's non-`Error` arm is unreachable through `format()` itself (Prettier only ever rejects with real `Error`s) — with so few total branches in the file, one uncovered arm was 50% of them. Exported `message()` for a direct unit test rather than trying to provoke the unreachable case through the adapter.
6. **Dry-run and a real run need _different_ exit-code semantics**, not the same one — my first draft computed both from "violations remaining," which makes `--dry-run` return `0` even when a fixable violation exists (since it _would_ be resolved). Fixed to: real run = state ("do violations remain"), dry-run = action-preview ("would anything change", `prettier --check`'s idiom). See ADR-0006 decision 7 before touching either.

7. **"Prove safety or decline" is only as good as the cases you thought of.** Two of the four decline conditions in `computeBlockFix` exist because a reviewer went looking: a comment _abutting_ the block (outside the contiguity window I was checking) and side-effect-only imports. For the latter my own reasoning — "we only move imports _between_ groups, never _within_ one, so order is preserved" — is exactly **inverted**: a bare `import "./setup.js"` exists precisely to run at a point relative to the others, so a cross-group move is the breaking one. Declining is cheap and always safe; the bar for adding a fifth condition should stay low.

8. **A mutating command must write in two phases.** Writing as the loop goes means a later file's failure leaves earlier ones already rewritten. Everything is in memory anyway, so compute-then-flush costs nothing and makes "nothing is written when a scan can't complete" true rather than aspirational.

9. **`split("\n")` leaves a trailing `""` for newline-terminated text.** Counting it as a diff line put an off-by-one in every hunk header we emitted, so `git apply` rejected every patch — invisible to `toContain` assertions. `diff.test.ts` now shells out to real `git apply`.

## State of the System

- ✅ Tests: **732 passing**, 0 failing (70 files). Aggregate coverage 97.88% lines / 94.31% branches / 99.77% functions
- ✅ Lint, typecheck, build, boundaries, format:check, license-check all clean at root
- ✅ Self-scan: `argus check .` (repo root) → **0 violations, 0 failures, 147 files**
- ✅ PR [#39](https://github.com/WeaversMask/argus-oss/pull/39) open, 4 commits, review packet posted as a comment
- ✅ Independent review (Opus, cross-family + escalated): **REQUEST CHANGES — 3 HIGH + 5 MEDIUM + 4 LOW, all addressed in-branch** and each HIGH re-verified end-to-end against the reviewer's own repro
- ⬜ **Awaiting the maintainer's merge decision** — agents never merge

## Recommended Next Steps

P2-06 needs nothing further from an agent. Once the maintainer merges #39:

1. Re-rotate this handover (archive to `docs/handovers/p2-06-autofix-engine-handover.md`) and flip the tracker's P2-06 row from `_pending_` to the PR link.
2. Pick up **P2-05** (diff mode — `packages/orchestrator/` doesn't exist yet, new territory) or start the **M1 showcase tail** (DOC-02/03/04, OPS-05 — no hard dependency on P2-05, so either order works).

If the maintainer wants changes on #39 first, the review packet is the PR comment and every finding's fix is in the `fix(cli,rules-builtin,rule-engine): address the #39 review packet` commit.

## Open Questions for the Next Agent

- Should `argus explain <rule-id>` report fixability? Not done this task; `docs/guide/cli.md` flags it as a known gap.
- Is the conflict-resolution behavior in `apply-fixes.ts` (keep the earlier-starting fix, drop an overlapping later one) the right policy once a second fixable rule exists, or should it escalate to a file-level failure instead of silently under-fixing? Untested territory beyond one rule.

## Files Touched This Session

Commit 1 (`packages/core`, `packages/rule-engine`, `packages/rules-builtin`): `fix.ts`/`format-error.ts`/`formatter.ts` [created] in core; `violation.ts`, domain/errors/ports `index.ts` [modified]; rule-engine `types.ts`/`handlers.ts`/`engine.ts` [modified]; rules-builtin `import-order.ts`/`support.ts` [modified] + tests.

Commit 2 (`apps/cli`, `packages/adapters/prettier`, workspace config): `apps/cli/src/{scan,apply-fixes,diff,position-offset,fix}.ts` [created], `check.ts`/`main.ts` [modified]; `packages/adapters/prettier/` [created, full package]; `pnpm-workspace.yaml`, `.dependency-cruiser.cjs`, `dependency-cruiser-rules.cjs` [split out], `eslint.config.mjs`, `Dockerfile.dev`, `docker-compose.yml`, `vitest.config.ts` [modified].

Not yet committed: `docs/adr/0006-*.md` [created]; `docs/IMPLEMENTATION.md`, `docs/HANDOVER.md`, `docs/guide/cli.md`, `docs/guide/rules.md`, `docs/dev/adding-a-rule.md`, `docs/architecture.md`, `packages/core/README.md`, `packages/rule-engine/README.md`, `packages/rules-builtin/README.md`, `apps/cli/README.md` [all modified].

## Sign-off

Code, tests, and gates are all green and self-scan-clean — what remains is entirely process (PR, review, tracker close-out), not implementation.

— claude-sonnet-5
