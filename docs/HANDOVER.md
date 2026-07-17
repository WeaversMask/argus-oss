# Handover — P1-03 complete

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-17
**Phase:** P1 — Domain Core (3/6 tasks done)
**Last task completed:** P1-03 — AST abstraction layer (PR pending merge — see tracker)

---

## Context

The hexagon has its first working edge: `@argus/ast` implements `AstParserPort` on tree-sitter's **wasm build** (ADR-0005) for TypeScript/JavaScript/Python, converts to core's frozen `AstNode` view with the `+1` coordinate contract tested, and adds `visit` (skip/stop) plus `AstDocument.query` (S-expression). **Next: P1-04 — Rule engine** (`packages/rule-engine`; deps P1-02 ✅ + P1-03, base on this branch only if [#22](https://github.com/WeaversMask/argus-oss/pull/22) hasn't merged — say so in the PR if you do). P1-05/P1-06 stay parallel-eligible off P1-01.

## Conventions established in P1-03 (follow, don't reinvent)

- **Consume `@argus/ast` through its index only** (cruiser-enforced). `parse()` for plain trees; `parseDocument()` **only** when you need queries — you then own `dispose()` (wasm memory is not GC'd; `parsed` stays valid after). The parser instance itself also has `dispose()` (deletes the engine parser, drops grammar references; documents first) — but grammar wasm is **unfreeable** (web-tree-sitter's `Language` has no delete), so **one adapter per process** is the design; don't churn instances outside tests. A retained `AstNode` pins its file's full source string (lazy `text`).
- **`AstNode.children` includes anonymous nodes** (keywords, punctuation) and comments. Rule-engine dispatch must expect node types like `"function"` or `"let"`; `fieldName` is how you find labelled children.
- **Positions:** 1-based end-exclusive; columns/indices are **UTF-16 code units** (JS string slicing ≡ LSP default), pinned by test.
- **Traversal is iterative** (explicit stack) everywhere — "never throws" includes stack overflow on pathological nesting. Keep that property in the rule engine's walk.
- **Benchmark pattern:** committed executable test in `tests/perf/`, strict local budget, widened `process.env.CI` budget (phase-note-sanctioned). P1-04's is stricter: CI runs it against a **committed baseline** — design that in from the start, not at the end.

## Gotchas for the next sessions (the ones that will actually bite)

1. **pnpm 11 edits `pnpm-workspace.yaml` itself** when a new dep has an unreviewed build script: install fails (`ERR_PNPM_IGNORED_BUILDS`) and pnpm scaffolds placeholder `allowBuilds` entries ("set this to true or false") into the file. Replace placeholders with an explicit decision — `false` = reviewed-and-denied (blocks script, install passes). SECURITY-NOTES §5 now documents both directions. Don't be surprised by a policy file diff you didn't write.
2. **New-package checklist grew:** vitest root `projects` entry · per-package `*-public-entry-only` cruiser rule · compose named volume + Dockerfile mkdir line · `pnpm notices` + license gate · (from OPS-04b) negative-test the new cruiser rule.
3. **`noUncheckedIndexedAccess` bites in tests** (`matches[0].captures[0]`): vitest runs fine, `tsc` fails. Non-null assertions are sanctioned in tests (eslint rule off there). Run root `pnpm typecheck` before assuming green.
4. **Grammar/engine compatibility:** web-tree-sitter 0.26 accepts language ABI 13–15 (current grammars: 14–15). A bump outside the window fails at `Language.load`; the per-language smoke tests catch it on update day. New language → `docs/dev/adding-a-language.md`.
5. **Weekly Stryker now mutates `ast/src` too** (glob picks it up). Wasm parsing per mutant will slow the weekly run; if it balloons, scope or shard before touching thresholds (report-only anyway).
6. Root gates before every push (`pnpm lint && pnpm typecheck && pnpm build && pnpm test`) — filtered runs bypass the task graph (P1-02 lesson, still true).

## Maintainer admin items (carried over + new)

1. **Merge P1-03** ([#22](https://github.com/WeaversMask/argus-oss/pull/22)) — unblocks P1-04.
2. D-1: Turbo remote cache decision (only decision still open).
3. Dependabot [#21](https://github.com/WeaversMask/argus-oss/pull/21) open (npm minor/patch group).
4. `nvm alias default 22` — **appears resolved** (fresh shells now get 22.23.1); confirm and drop from this list next rotation.
5. Archive the retired `argus` repo · delete `~/argus-pre-scrub-backup.bundle` when satisfied · `NPM_TOKEN`/`LICENSE`/private-vuln-reporting stay in the go-public bucket.

## State of the System

- ✅ Root gates green on the branch: 204 tests (core 126, testing 33, ast 45), aggregate 99.2%/98%/100%; lint/typecheck/build/boundaries/license clean
- ✅ Benchmark: 1000-line TS parse median 13.2ms local M2 (budget 100; CI 500)
- ⏸ P1-03 PR pending human merge (tracker + this handover ride in it)
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

Parse, convert, freeze, dispose — the first adapter proves the port design holds. The rule engine gets a tree it can trust; mind the anonymous children.

— claude-fable-5
