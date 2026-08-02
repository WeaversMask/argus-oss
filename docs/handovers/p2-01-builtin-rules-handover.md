# Handover — P2-01 (first built-in rules)

**From:** claude-opus-4-8
**To:** next picker (Phase 2 continues)
**Date:** 2026-07-23
**Phase:** P2 — MVP (1/6+4) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** P2-01 — `@argus/rules-builtin` (ten TS/JS rules) — **PR pending merge**

---

## What just landed

`@argus/rules-builtin` — the sixth real package, first library of `RuleModule`s against the P1-04 engine. Ten rules, exported individually and as a frozen `builtinRules` array:

- **quality:** `cyclomatic-complexity`, `max-file-length`, `max-function-length`, `max-nesting-depth`, `no-dead-code`
- **style:** `naming-convention`, `import-order`, `no-wildcard-imports`
- **docs:** `require-jsdoc` · **testing:** `no-empty-test`

Reference: [`docs/guide/rules.md`](../guide/rules.md) (what each flags, defaults, options). Package internals + coverage exceptions: [`packages/rules-builtin/README.md`](../../packages/rules-builtin/README.md). How to add another rule: the extended [`docs/dev/adding-a-rule.md`](../dev/adding-a-rule.md).

## What P2-02 (CLI) needs to know — you are unblocked to make real findings

1. **Register the catalogue, activate a subset.** `import { builtinRules } from "@argus/rules-builtin"` → `engine.register(rule)` for each. `builtinRules` is the catalogue, **not** the active set — config decides activations (severity + options per `ruleId`). The `suppressions:`/rule-activation config wiring is still deferred (P1-05 notes); the CLI/orchestrator decides how config maps to `RuleActivation[]`.
2. **`check` wiring (unchanged from P1 handover, now with real rules):** config (`ConfigLoader.search`) → parse (`TreeSitterAstParser`, **one instance per process** — grammar wasm is unfreeable) → `Engine.run` per file (registered rules) → `Runner` aggregates → `matchingSuppression` filters (inject `now`) → `classifyLayer`/`scoreConformance` for reporting.
3. **`argus explain <rule-id>`** has real content now: `rule.name`, `.description`, `.defaultSeverity` off each `RuleModule`; the id vocabulary is the ten `category/name` ids.
4. **`apps/cli` is the first non-`packages/` member.** `pnpm-workspace.yaml` already includes `apps/*`. Write a **fresh cruiser rule** (`apps/cli` public entry) — the per-package-rule pattern; negative-test it (see below). Add the app to root `vitest.config.ts` projects, Docker mkdir + compose volume (new-package checklist).

## Gotchas this task discovered (carry forward for any rule/fixture package)

- **Fixtures are data, not code — exclude them from four tools or gates break:** Vitest collection (some fixtures are named `*.test.ts`), the package `tsconfig` (invalid TS / missing-module refs), ESLint typed linting (project-service can't resolve them), and Prettier (reformatting changes the line counts length rules assert on). Each exclusion is commented at its site; `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, and `vitest.config.ts` all carry a `tests/fixtures` entry.
- **lint-staged + ESLint flat-config:** an explicitly-passed ignored file emits a "File ignored" warning that `--max-warnings=0` turns into a **commit failure**. Fixed globally by adding `--no-warn-ignored` to the lint-staged eslint task — reuse, don't rediscover.
- **Grammar vocab drifts and differs across languages.** Verify node types against the _pinned_ grammar (dump a real tree with `@argus/ast` — an `appendFileSync` to a scratch file dodges Vitest's console capture), don't trust memory. Keep the concepts in `src/grammar.ts`, not inline strings.
- **Position end-lines are `+1` end-exclusive** (`convert.ts`): a function's line span is `endLine - startLine + 1` (nodes end at `}`, no trailing newline), but a **file's** length must use `lineCount(root.text)` (the root end can sit past a trailing newline).
- **Scope metrics without parent links:** subscribe to function-like nodes (+ `program`/`module`) and recurse the subtree, stopping at nested functions — clean scope partitioning. `AstNode` has no parent pointer (deferred, P1-02).

## Rule-authoring pattern (now established — see the recipe for the full version)

`defineRule({ id, name, description, defaultSeverity }, create)` → export from `src/index.ts` → add to `builtinRules`. Fixtures in `tests/fixtures/<cat>/<rule>/{valid,invalid}/` (≥5 each, extension drives language) run through a **real** Engine + parser via `tests/harness.ts` (`runRule` / `runRuleResult`); `fixtureSuite` enforces valid→0 / invalid→≥1. Threshold rules keep fixtures tiny with a small `max` option in the test and pin defaults separately. Property-test any stated law (`tests/properties.test.ts`, fast-check). Read options with `positiveIntOption` (bad option → attributed failure, not wrong finding).

## Evergreen (carried forward)

- Root gates before every push (`pnpm lint && typecheck && build && test`); filtered runs bypass turbo's graph.
- prettier reflows Markdown tables — `pnpm exec prettier --write <files>` before staging.
- commitlint header ≤100 chars; a failed commit leaves files staged.
- `gh pr edit` fails here (projectCards GraphQL) — PATCH via `gh api`.
- **Bash CWD drifts** when a `cd` fails mid-session — prefer absolute paths / `cd /Users/martinrodriguez/argus` first.
- Never `--no-verify`; scoped `SKIP=<gate>` with written justification only.

## Open decisions / scope calls to revisit

- **Language scope of the built-in rules is TS/JS.** Python parses but these ten rules are TS/JS-tuned/fixtured; `src/grammar.ts` is written broad so Python coverage is additive, not a redesign. Maintainer may want Python rules queued as a follow-up.
- Open decisions D-1 (turbo remote cache), D-5 (core build step at first publish), D-6 (in-PR nit re-review) unchanged — see IMPLEMENTATION.md.

## Maintainer admin items

1. **Merge the P2-01 PR** ([argus-oss#29](https://github.com/WeaversMask/argus-oss/pull/29), review packet posted, re-review approve) — then it's Phase 2, 1/6+4.
2. Dependabot queue (npm-minor-and-patch, rimraf, types/node branches on origin).
3. Prior unchanged items: retired-repo archive, pre-scrub bundle deletion, go-public bucket.

## Sign-off

The engine has real work to do now: ten checks that read a parsed tree and tell the truth about it, each proven against source it will actually see. Point a CLI at them next and Argus starts finding things — including, soon, in its own code.

— claude-opus-4-8
