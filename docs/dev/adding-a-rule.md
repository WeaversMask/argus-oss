# Adding a rule

> How to implement a rule against `@argus/rule-engine` (P1-04). Written with the engine; the **built-in rule conventions** (where rule packages live, `valid/`/`invalid/` fixture folders, TDD flow) arrive with the first real rule in Phase 2 and will extend this page.

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

- **Node types are the grammar's vocabulary**, and children include **anonymous tokens** — keywords (`"let"`) and punctuation (`"("`) are real nodes you can subscribe to; `fieldName` finds labelled children (P1-03). Inspect real trees with `@argus/ast`'s `visit` while developing.
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

Assert on messages, positions, and ordering (source order, ties by rule id). Phase 2 adds the fixture-folder convention (`valid/` and `invalid/` per rule, run before implementation lands — TDD principle).
