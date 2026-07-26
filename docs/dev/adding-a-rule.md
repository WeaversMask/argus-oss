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

### Offering a fix (P2-06)

A rule can attach a mechanical edit to a report: `context.report({ message, position, fix: { position, replacement } })`. The engine threads `fix` onto the resulting `Violation` unchanged (it's additive on `RuleReport`/`Violation`, no port signature changed); `argus fix` collects every violation carrying one, applies it via `magic-string`, then runs the touched file through Prettier as a finishing pass.

**Only offer a fix when you can prove it is safe for that specific case — never guess.** `style/import-order`'s fixer (`packages/rules-builtin/src/style/import-order.ts`) is the reference example: it computes a whole-block reorder but withholds it whenever the block of imports contains anything other than `import_statement` nodes (a comment sitting between two of them would be silently stranded in the wrong place if the statements moved around it), when a comment touches the block with no blank line between them, when any import is side-effect-only, or when two imports share one line (there is no way to reconstruct the whitespace that belonged between them). A violation with no fix is still reported — under-fixing a case you can't prove safe is always better than a wrong edit.

**Moving code past a comment is a semantic change, not a cosmetic one.** Three of `import-order`'s four decline conditions exist because a reviewer found a case the author had reasoned was safe, and the comment condition took two rounds to get right. The trap both times was the same: a comment that _looks_ decorative may be load-bearing. Every line-scoped directive — `// eslint-disable-next-line`, `// @ts-expect-error`, `// biome-ignore`, `// prettier-ignore`, `// istanbul ignore next` — binds to whatever line follows it, so moving a statement out from under one silently transfers a suppression to code that never needed it (with `@ts-expect-error`, that is a compile error in both directions). If your fix relocates anything, treat an adjacent comment as attached unless a blank line proves otherwise.

**A rule sees only the AST, never raw source text or byte offsets** (`AstNode` deliberately doesn't expose them — P1-03 scope limit). Build `Fix.replacement` from node `.text`, and reconstruct the gap between two nodes from their line numbers alone: `"\n".repeat(nextNode.position.startLine - prevNode.position.endLine)` is exact for one-per-line code and is how `import-order` preserves existing blank-line grouping under reordering. `support.ts`'s `spanning(a, b)` builds the validated `Position` spanning two nodes for you, alongside the existing `pointAt`.

**Conflict resolution is the apply step's job, not your rule's.** `apps/cli/src/apply-fixes.ts` de-duplicates fixes by structural equality (same range, same replacement) and, for two different fixes that still overlap, keeps the earlier-starting one and drops the rest — your rule never needs to reason about what else might be reported in the same file. If several violations describe the same underlying edit (a whole-block fix commonly resolves more than one of them at once), attach the identical `fix` value to each — the apply step collapses duplicates before splicing anything in.
