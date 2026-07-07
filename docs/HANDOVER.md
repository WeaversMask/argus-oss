# Handover — P1-02 complete

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-07
**Phase:** P1 — Domain Core (2/6 tasks done)
**Last task completed:** P1-02 — Core port interfaces ([argus-oss#13](https://github.com/WeaversMask/argus-oss/pull/13), pending merge)

---

## Context

The hexagon has its edges: ten ports in `packages/core/src/ports/` with full TSDoc contracts, six new port-level `DomainError`s, and in-memory fakes for every port in `packages/testing/src/mocks/`. **Next: P1-03 — AST abstraction layer** (`@argus/ast`, tree-sitter wrapper conforming to `AstParserPort`). P1-05/P1-06 stay parallel-eligible off P1-01. Branch from `main` after #13 merges — #13 owns this tracker/handover state.

## Port conventions established in P1-02 (follow these, don't reinvent)

- **Async:** port methods return `Promise<Result<T, E>>` (plain neverthrow, not `ResultAsync`). Implementations never throw — failures travel as `DomainError` values.
- **Absence is not an error:** lookups resolve `ok(undefined)` / `ok([])`.
- **`AstNode`/`ParsedFile` live in core** (`ports/ast-parser.ts`) — `@argus/ast` conforms _inward_ to them; core never imports an AST library. The contract is minimal (nodeType, position, text, children); visitors and queries belong to `@argus/ast`.
- **Positions crossing any port are 1-based end-exclusive** (ADR-0004).
- **Fakes:** type-only imports from `@argus/core`; failure injection is `failNextWith(error)` with the _test_ supplying the error instance; `FakeAstParser.parse` rejects on unprimed files (test-setup bug → loud). Extend these fakes rather than hand-rolling new doubles.
- The `require-await` lint rule rejects await-less `async` methods — write sync methods returning `Promise.resolve(...)`.
- **`@argus/testing` depends on `@argus/core` via `peerDependencies` ONLY — never add it to devDependencies.** Turbo refuses package-graph cycles even when dev-only (`core` dev-depends on `testing` for its vitest config); peer edges sit outside turbo's graph, and pnpm auto-installs workspace peers, so resolution still works. Both are default behaviors, verified 2026-07-07 after CI caught the cycle.

## Gotchas for P1-03 (the ones that will actually bite)

1. **`@argus/ast` is a NEW package** — the full checklist applies: compose named volume + Dockerfile mountpoint line, root `vitest.config.ts` projects entry, `pnpm notices` after the dep tree changes.
2. **Tree-sitter deps need the ADR-0003 dance:** exact-pin every grammar, `minimumReleaseAge` 3-day gate, `allowBuilds` review (tree-sitter packages ship native/wasm build scripts — expect to justify entries), license gate over new transitives.
3. **`+1` conversion contract tests are mandatory**, not optional: tree-sitter is 0-based end-exclusive, ours is 1-based end-exclusive — a uniform `+1` on all four numbers. In-range off-by-ones pass validation (ADR-0004 residual risk); only contract tests catch them.
4. Per-language parse smoke test (phase note): catches grammar drift on dependency updates.
5. Performance acceptance: 1000-line TS file < 100ms on M2 — benchmark early, not at the end.
6. **Every shell needs Node 22 first:** `source ~/.nvm/nvm.sh && nvm use` before any `pnpm`/`git commit` — `nvm alias default 22` still pending (admin item).
7. Session hygiene: sync main first; context budget 50→70% **of the 1M window**; full-packet review tier for executable core logic.
8. **Run ROOT `pnpm typecheck && pnpm build && pnpm test` before every push** — `pnpm --filter <pkg> …` bypasses turbo entirely, so it cannot catch task-graph problems (that is how the P1-02 cycle reached CI).

## Maintainer admin items (carried over + new)

1. **Merge [#13](https://github.com/WeaversMask/argus-oss/pull/13)** — unblocks P1-03/P1-04.
2. Archive the retired `argus` repo (Settings → Archive).
3. D-1: Turbo remote cache decision (only decision still open).
4. Dependabot PRs #1–#7.
5. `nvm alias default 22` on the dev machine.
6. Delete `~/argus-pre-scrub-backup.bundle` when satisfied.
7. `NPM_TOKEN` / `LICENSE` placeholder / private-vuln-reporting — go-public bucket, unchanged.

## State of the System

- ✅ Local gates green on the branch: 158 tests aggregate (`@argus/core` 126, `@argus/testing` 32), 100% lines/branches/functions both packages, lint/typecheck clean
- ⏸ [#13](https://github.com/WeaversMask/argus-oss/pull/13) open (P1-02 + this tracker/handover state), pending human merge
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

Entities speak, ports listen. The first adapter (tree-sitter) gets to prove the whole hexagon idea — measure it, pin it, and mind the `+1`.

— claude-fable-5
