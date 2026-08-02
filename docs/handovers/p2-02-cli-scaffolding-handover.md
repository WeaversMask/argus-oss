# Handover — P2-02 (CLI scaffolding)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-24
**Phase:** P2 — MVP (2/6+4) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-02 — `@argus/cli` (`check`/`init`/`explain`) — **PR pending merge**

---

## Context

**Argus runs now.** `node apps/cli/bin/argus.mjs check .` walks a real tree, parses it, runs the ten P2-01 rules, prints findings, and exits 0/1/2. Everything before this was libraries; this is the first task whose output a human can point at a codebase and use — and the first that could dogfood, which it did (see below).

`apps/cli` is the first `apps/*` member. It owns **no analysis logic**: it wires `@argus/config` → `@argus/ast` → `@argus/rule-engine` + `@argus/rules-builtin` and maps outcomes to exit codes. Read [`apps/cli/README.md`](../../apps/cli/README.md) for internals and [`docs/guide/cli.md`](../guide/cli.md) for the user-facing surface.

## The one decision that shapes everything here: how the CLI runs

The workspace is **buildless** — packages export raw `.ts` and import internals with `.js` bundler specifiers. So `node anything.ts` cannot load a single `@argus/*` module: Node neither remaps `.js`→`.ts` **nor** accepts the domain's TS parameter properties (`constructor(private readonly x)`) in strip-only mode. Both were verified empirically, not assumed.

**The maintainer ruled: zero-dependency hook** (over adding `tsx`, over a bundler). So [`bin/argus.mjs`](../../apps/cli/bin/argus.mjs) re-execs node with `--experimental-transform-types --disable-warning=ExperimentalWarning --import loader/register.mjs`, where [`loader/hooks.mjs`](../../apps/cli/loader/hooks.mjs) is a ~15-line resolve hook redirecting relative `.js` to its `.ts` sibling. Exit code and stdio pass through verbatim.

**Consequences you inherit:**

- Adding a runtime dep to the CLI is still cheap; adding a _build step_ would let you delete the wrapper. That trade is open, not settled.
- `npm i -g @argus/cli` does **not** work yet — bundling is deliberately deferred. DOC-02's demo needs a story for this (running from a clone is fine for a recording).
- **Tests bypass all of it.** Vitest resolves TS itself, so never reach for the loader in a test.

## What P2-03/P2-04 (the next tasks) need to know

1. **`run(argv, io)` in [`src/main.ts`](../../apps/cli/src/main.ts) is the seam.** Every command is a pure function of args + an injected `CliIO` (`stdout`/`stderr`/`cwd`). Add a flag there; test it with `captureIO` from [`tests/support.ts`](../../apps/cli/tests/support.ts). No test spawns a process or patches a global stream — keep it that way.
2. **`src/format.ts` is a deliberate placeholder.** Plain text, no colour, no symbols — it exists so the exit-code contract is observable. P2-03 should replace/extend it (`NO_COLOR`, severity colours) and P2-04 add `formatters/json.ts`. `ScanReport` (`violations` + `failures` + `filesScanned`) is the shape to format; keep failures in it — the summary must keep telling the truth about unanalysed files.
3. **P2-04 names `@argus/api-contracts` for its zod schema. That package does not exist.** Creating it is part of P2-04 — run the full new-package checklist (below), and note `zod` is already vetted (P1-05).
4. **commander is intercepted, not trusted to exit.** `exitOverride()` + `configureOutput` route everything through `CliIO`; help/version map to 0, other `CommanderError`s to 2. Bare `argus` calls `outputHelp()` explicitly — a commander _default action_ makes an unknown command report "too many arguments" instead, which is why it isn't one.

## Dogfooding: what the first self-scan actually said

This is the phase's headline capability, so here is the real data rather than a claim:

- **`argus check apps/cli/src` → 0 violations.** But not on the first run: it flagged my own `runCheck` (103 lines, cyclomatic complexity 20) and `discoverFiles` (61 lines). Both were decomposed in response — the tool's first real finding was against its own author's code, and the fix is in the diff.
- **`argus check packages` → 179 warnings.** Do **not** read this as 179 defects. Overwhelmingly two clusters: (a) `packages/rules-builtin/tests/fixtures/**`, which are deliberately-invalid _data_ files (already excluded from tsconfig/ESLint/Prettier/Vitest for the same reason), and (b) `docs/require-jsdoc` on test helpers.

**So the dogfooding-wiring task is mostly one design decision: what goes in the repo-root `argus.yaml` `ignore:` list.** Fixtures certainly. Whether test helpers must carry JSDoc is a genuine policy call — take it to the maintainer rather than silently switching the rule off. A CI job running Argus on Argus is the other half (phase exit criterion).

## The review caught a real bug — worth knowing what it was

The independent review (Sonnet, cross-family) returned **REQUEST CHANGES** on a HIGH finding, and it was right. `ignore:` globs were matched against paths relative to the **invocation directory**, but `ConfigLoader.search` walks _upward_ — so a root config saying `ignore: ["packages/*/generated/**"]` silently stopped excluding anything the moment you ran `argus` from inside `packages/foo`. Reproduced, then fixed by [`src/project-root.ts`](../../apps/cli/src/project-root.ts): the nearest `argus.yaml` above the scan path anchors both glob matching and displayed paths, so a scan means the same thing from any directory. Two regression tests cover it.

**The reusable lesson:** `@argus/config` returns a _merged_ config and never says which file it came from. Any consumer needing config-relative semantics has to re-derive the root (this one mirrors the walk via the public `CONFIG_FILE_NAMES`). If a second consumer needs it, that's the signal to widen the config API instead of duplicating the walk.

Also fixed from the same review: a signal-killed child exited 1 (claiming "violations found") instead of 2; and `tests/bin.test.ts` now spawns the **real executable** — the re-exec wrapper and resolve hook had no automated coverage at all, because every other test drives `run(argv, io)` in-process.

## Gotchas this task discovered

1. **`pnpm boundaries` only cruised `packages`** — an `apps/` tree would have been invisible to the architecture gate. Now `depcruise apps packages`, plus a `packages-never-import-apps` rule (negative-tested: it fires). Apps need no `*-public-entry-only` rule of their own; each package's existing rule already governs apps as importers.
2. **Pre-existing cruiser blind spot, filed not fixed:** a _bare-specifier_ deep import (`@argus/rule-engine/src/engine.js`) is `couldNotResolve` to dependency-cruiser, so **no rule fires** — verified. The same import written relatively _is_ caught. Impact is low (Node and tsc both reject it anyway), and closing it needs a `no-unresolvable` rule **plus** a fixtures exclusion (30 fixture hits otherwise) — out of scope for a CLI task, worth a small config PR.
3. **`$?` after a pipe is the pipe's exit code.** `argus check x | tail` reported 0 while argus had exited 1. Cost me a false "bug" moment; verify exit codes with a redirect, not a pipe.
4. **`.work/` is gitignored** — task notes stay local and never reach the PR. Don't try to `git add` them.
5. **Node's strip-only mode is not "TypeScript support".** Parameter properties, enums, namespaces all need `--experimental-transform-types`. Worth knowing before anyone tries `node --run` on another package.

## Evergreen (carried forward)

- Root gates before every push (`pnpm lint && typecheck && build && test`); filtered runs bypass turbo's graph.
- prettier reflows Markdown tables — `pnpm exec prettier --write <files>` before staging.
- commitlint header ≤100 chars; a failed commit leaves files staged.
- `gh pr edit` fails here (projectCards GraphQL) — PATCH via `gh api`.
- **Bash CWD drifts** when a `cd` fails mid-session — prefer absolute paths.
- Never `--no-verify`; scoped `SKIP=<gate>` with written justification only.

## State of the system

- ✅ Tests: **579 passing** (59 files), 0 failing. Aggregate coverage 97.9% lines / 94.0% branches
- ✅ Lint, typecheck, build, boundaries: clean at root
- ✅ License gate: 568 packages, commander added (MIT), notices regenerated
- ✅ Self-scan of the new code: 0 violations

## Open decisions / scope calls

- **Test-helper JSDoc policy** (above) — needs a maintainer call during dogfooding wiring.
- **CLI packaging**: the loader wrapper vs. a build step, forced whenever a global install matters (interacts with D-5, core's build step at first publish).
- D-1, D-5, D-6 unchanged — see IMPLEMENTATION.md.

## Maintainer admin items

1. **Merge [#32](https://github.com/WeaversMask/argus-oss/pull/32) first, then [#31](https://github.com/WeaversMask/argus-oss/pull/31).** #32 is a one-line `postcss` override closing a HIGH path-traversal advisory published mid-session; it fails the audit gate on `main` and every open PR, unrelated to any of our changes (10/10 green). #31 is P2-02 itself — 9/10 green, the only red being that same audit gate, so it needs an update from `main` after #32 lands. Then Phase 2 is 2/6+4.
2. Dependabot queue (npm-minor-and-patch, rimraf, types/node branches on origin).
3. Prior unchanged: retired-repo archive, pre-scrub bundle deletion, go-public bucket.

## Sign-off

Argus scanned its own CLI, found two things wrong with it, and those two things are fixed in this diff. That is the whole thesis of the project working for the first time — point it at something next.

— claude-opus-5
