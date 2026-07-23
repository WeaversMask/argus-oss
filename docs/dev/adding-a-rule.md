# Adding a rule

> How to implement a rule against `@argus/rule-engine` (P1-04). The first half is the engine contract (any rule, anywhere); the [**Built-in rule conventions**](#built-in-rule-conventions-argusrules-builtin) section at the end is how rules land in `@argus/rules-builtin` (P2-01) — package layout, fixture folders, TDD flow.

A rule is a `RuleModule`: the static domain `Rule` (identity, docs, default severity) plus a `create` function that subscribes listeners for one file run. Registering the module is the only integration point — the engine never changes when a rule is added.

## The shape

```ts
import { rule, ruleId } from "@argus/core";
import type { RuleContext, RuleModule } from "@argus/rule-engine";

export const noLet: RuleModule = {
  rule: rule({
    id: ruleId("style/no-let")._unsafeUnwrap(),
    name: "no-let",
    description: "Prefer const over let bindings.",
    defaultSeverity: "warning",
  })._unsafeUnwrap(),
  create: (context: RuleContext) => ({
    // "<nodeType>"        → enter (pre-order)
    // "<nodeType>:exit"   → after the node's children (post-order)
    // "*" / "*:exit"      → every node
    let: (node) => {
      context.report({ message: "Use const.", position: node.position });
    },
  }),
};
```

`create` runs once per rule per file with a fresh frozen context; per-file state lives in the closure it returns (count things in listeners, report in a `"*:exit"` or `<root>:exit` listener if you need end-of-file aggregation).

## Rules of the road

- **Node types are the grammar's vocabulary**, and children include **anonymous tokens** — keywords (`"let"`) and punctuation (`"("`) are real nodes you can subscribe to; `fieldName` finds labelled children (P1-03). Inspect real trees with `@argus/ast`'s `visit` while developing. Two exceptions: `"*"` is reserved as the every-node wildcard and a bare `":"` is not a parseable selector — to match those literal tokens, use a `"*"` listener and check `node.nodeType`.
- **Listeners are synchronous and return `void`.** No `skip`/`stop`: every active rule shares one walk. A Promise-returning listener (or `create`) fails the rule, deliberately.
- **You cannot mutate anything.** Context, options, nodes, and positions are frozen/read-only; a mutation attempt is a `TypeError` in strict mode and fails your rule.
- **Report, don't construct.** `context.report({ message, position })` — usually `node.position`, always a range in the current file (`context.file`). The engine assigns severity (the activation's, not your default), layer, and a deterministic violation id.
- **Crashing fails your rule loudly.** A throw, an invalid selector, or an invalid report fails the whole file's run with a `RuleExecutionError` naming your rule — there is no silent skip. Multi-file resilience is the `Runner`'s job, not yours.
- **Options arrive frozen** on `context.options` (the activation's rule-specific config, opaque to the domain). Validate them defensively; bad options should produce a clear thrown error (→ attributed failure), not wrong findings.

## Testing a rule

Build synthetic frozen trees (cheap, grammar-independent — see `packages/rule-engine/tests/helpers.ts`) or parse real snippets with `@argus/ast`. Run through a real `Engine` — no mocking of own code:

```ts
const engine = new Engine();
engine.register(noLet)._unsafeUnwrap();
const violations = (await engine.run({ parsed, activations }))._unsafeUnwrap();
```

Assert on messages, positions, and ordering (source order, ties by rule id).

## Built-in rule conventions (`@argus/rules-builtin`)

The ten P2-01 rules established the pattern below. A new built-in rule needs **zero engine changes** — it's a new file, its fixtures, its test, and one line in the catalogue.

### Layout

```
packages/rules-builtin/
  src/<category>/<rule-name>.ts     # one RuleModule, rich TSDoc (feeds the rule reference)
  src/grammar.ts                    # shared node-type vocabulary — reuse it, don't scatter magic strings
  src/support.ts                    # defineRule, positiveIntOption, listenTo, pointAt, lineCount, namePosition
  tests/<rule-name>.test.ts         # fixtureSuite(module, "<category>/<rule-name>", options?) + specifics
  tests/fixtures/<category>/<rule-name>/{valid,invalid}/*.ts   # ≥5 each
```

Define the module with `defineRule({ id, name, description, defaultSeverity }, create)` and export it from `src/index.ts`, then add it to the `builtinRules` array (keep the boundary-cruiser rule and this catalogue in sync — new-package/new-rule checklist).

### Fixtures are the spec (TDD)

- **`valid/` → zero violations, `invalid/` → at least one.** `fixtureSuite` (in `tests/`) enforces exactly that and that each folder has ≥5 files; write the fixtures first. File **extension drives the parse language** (`.ts`→typescript, `.js`→javascript), so a rule can mix cases in one folder.
- Fixtures run through a **real** `Engine` + `TreeSitterAstParser` via `tests/harness.ts` — `runRule(module, source, opts)` for violations, `runRuleResult(...)` when you need to assert a rule _failure_ (bad options). No mocking of own code.
- For threshold rules (length/complexity/nesting), keep fixtures tiny by passing a small `max` in the test (`fixtureSuite(rule, path, { max: 3 })`) and pin the real default in a separate "defaults to …" case.
- **Fixtures are data, not code:** they are excluded from tsconfig, ESLint, Prettier, and Vitest collection. Never let a formatter touch them — it changes the line counts length rules depend on.

### Know the grammar before you subscribe

Node types are the grammar's vocabulary, including anonymous tokens. Before writing listeners, inspect real trees — parse a representative snippet with `@argus/ast` and walk it with `visit`, or dump it (an `appendFileSync` to a scratch file sidesteps Vitest's console capture). Grammar labels differ across languages and drift across grammar versions, so verify against the pinned grammar rather than memory. Put whatever you learn into `src/grammar.ts` as a named set, not inline strings.

### Options and property tests

- Read options defensively: `positiveIntOption(context.options, "max", default)` throws a clear error on garbage → an attributed `RuleExecutionError`, not a wrong finding.
- Add a **property test** (`tests/properties.test.ts`, `fast-check`) wherever the rule states a law — a threshold (`reports iff metric > max`), or an invariant (an `else if` ladder of any length never inflates nesting depth).
