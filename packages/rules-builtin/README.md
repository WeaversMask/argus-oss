# `@argus/rules-builtin`

> The first real `RuleModule` consumers of the engine — ten quality, style, docs, and testing checks for TypeScript and JavaScript. This is what makes `argus check` produce findings.

## Purpose

`rules-builtin` is the starter catalogue of checks Argus ships with. Each rule is a `RuleModule` (a static `Rule` plus a `create` factory that subscribes AST listeners); registering one is the only integration point, so the engine never changes when a rule is added. The package owns **the rules themselves and their fixtures** — it does not run them (that's `@argus/rule-engine`), parse source (`@argus/ast`), or decide which rules are active (config, P1-05): the exported `builtinRules` array is a catalogue, not an active set.

**Language scope:** TypeScript + JavaScript. The two share the tree-sitter-typescript / tree-sitter-javascript node vocabulary, and the primary consumer (dogfooding on the Argus TS codebase) is TS. `src/grammar.ts` centralises the grammar-concept → node-type mapping and is written language-broad (Python's node types are already listed where harmless) so Python rule coverage can be added later without redesign — but these ten rules are tuned and fixture-covered for TS/JS only.

## Public surface

| Export                                                                                                                                                                               | Kind           | Summary                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------- |
| `builtinRules`                                                                                                                                                                       | `RuleModule[]` | Every built-in rule, frozen, in a stable order — the catalogue to register |
| `cyclomaticComplexity`, `maxFileLength`, `maxFunctionLength`, `maxNestingDepth`, `noDeadCode`, `namingConvention`, `importOrder`, `noWildcardImports`, `requireJsdoc`, `noEmptyTest` | `RuleModule`   | The individual rules — see the table below and each module's TSDoc         |

### The rules

| Rule id                         | Default | Options     | What it flags                                                                      |
| ------------------------------- | ------- | ----------- | ---------------------------------------------------------------------------------- |
| `quality/cyclomatic-complexity` | warning | `max` (10)  | Functions with more than `max` linearly independent paths (`1 + decision points`)  |
| `quality/max-file-length`       | warning | `max` (300) | Files longer than `max` lines                                                      |
| `quality/max-function-length`   | warning | `max` (50)  | Functions whose line span exceeds `max`                                            |
| `quality/max-nesting-depth`     | warning | `max` (4)   | Block nesting deeper than `max` (per scope; `else if` ladders stay at one level)   |
| `quality/no-dead-code`          | warning | —           | Statements after a `return`/`throw`/`break`/`continue` in a block or `switch` case |
| `style/naming-convention`       | warning | —           | Non-PascalCase types; functions not camel/PascalCase; snake_case variables         |
| `style/import-order`            | warning | —           | Imports out of group order (node builtins → external → relative)                   |
| `style/no-wildcard-imports`     | warning | —           | `import * as ns` namespace imports (`export * from` re-exports are allowed)        |
| `docs/require-jsdoc`            | warning | —           | Exported functions/classes/interfaces without a preceding `/** … */` block         |
| `testing/no-empty-test`         | warning | —           | `it`/`test` calls whose callback body is empty (comment-only counts as empty)      |

Options arrive on `context.options` (frozen). A present-but-invalid `max` (non-integer, `< 1`) is a defensive throw → an attributed `RuleExecutionError`, never a silently wrong finding.

## How it fits

- **Depends on:** `@argus/core` (`rule`/`ruleId` factories, `Position`), `@argus/rule-engine` (`RuleModule`/`RuleContext` types), `neverthrow`.
- **Dev-depends on:** `@argus/ast` (parses fixtures in tests), `@argus/testing` (vitest config), `fast-check` (property tests).
- **Consumed by:** scan orchestration and the CLI (Phase 2) register `builtinRules` with an `Engine`.
- **Boundary rules:** imports land on the public entry only (`rules-builtin-public-entry-only` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)).

## Usage

```ts
import { Engine } from "@argus/rule-engine";
import { builtinRules, maxFunctionLength } from "@argus/rules-builtin";

const engine = new Engine();
for (const rule of builtinRules) engine.register(rule)._unsafeUnwrap();

// Activate a subset at chosen severities/options (normally from config):
const activations = [
  { ruleId: maxFunctionLength.rule.id, severity: "warning", options: { max: 40 } },
];
const result = await engine.run({ parsed, activations });
```

## Maintenance notes

- **Testing is fixture-driven TDD.** Every rule has `tests/fixtures/<category>/<rule>/{valid,invalid}/` with ≥5 files each, run through a **real** `Engine` + `TreeSitterAstParser` (no mocking of own code) by `tests/harness.ts`; `fixture-suite.ts` asserts the baseline contract (valid → 0 violations, invalid → ≥1). See the extended [`docs/dev/adding-a-rule.md`](../../docs/dev/adding-a-rule.md) for the full convention, including how to inspect real trees while authoring.
- **Fixtures are data, not code.** They are excluded from the package `tsconfig`, from ESLint (`eslint.config.mjs`), from Prettier (`.prettierignore`), and from Vitest collection (`vitest.config.ts` — some `no-empty-test` fixtures are themselves named `*.test.ts`). Reformatting them would change the line counts the length/nesting fixtures assert on.
- **Thresholds in tests use small `max` options** so fixtures stay tiny; the documented defaults are pinned separately (`*.test.ts` "defaults to …" cases).
- **Uncovered defensive branches (all guard against degenerate/malformed parse trees, part of the never-crash posture):** `import-order` — an `import_statement` with no `source` field, and the `split("/")` root fallback; `naming-convention` — a checked declaration with no `name` field (an anonymous default export is not a `class_declaration`, so it is not reached); `no-empty-test` — a test call with no `arguments` node; `no-dead-code` — a `switch` case with no `:` token; `require-jsdoc` — a bare (non-exported) `function_signature`. Coverage sits at ~98% lines / ~95% branches.
- Private workspace package; not published.
