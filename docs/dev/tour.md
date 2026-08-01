# The 15-minute tour

> Five stops, in order. Each names one thing to open and what to notice in it. The tour **orients** — it does not repeat what the linked files say, so follow the links as you go. At the end you should be able to work through [`adding-a-rule.md`](./adding-a-rule.md) without anyone's help.

If you only have five minutes, do stops 1 and 4.

## 1 · The shape — [`../architecture.md`](../architecture.md) · 3 min

**Notice:** Argus is ports-and-adapters. `packages/core` is the centre and imports nothing internal — not even a Node builtin; everything else depends on it, never the reverse. Adapters implement core's port interfaces against the outside world; apps are thin wiring with no business logic of their own.

Read the "What exists today" table and stop there. Eight packages and one app are real; everything else in `01-repo-structure.md` is still planned, and knowing which is which saves you hunting for code that hasn't been written.

## 2 · The domain, and one port — `packages/core/src/` · 4 min

Open two files.

[`domain/violation.ts`](../../packages/core/src/domain/violation.ts) (42 lines) is every domain type in miniature. **Notice** the four conventions that hold everywhere in `core`: ids are branded types rather than bare strings, the factory is a _smart constructor_ returning `Result<Violation, ValidationError>` instead of throwing, it collects **all** validation problems rather than the first, and the value it hands back is frozen. Once you have seen it here you have seen it in all of them.

[`ports/ast-parser.ts`](../../packages/core/src/ports/ast-parser.ts) (70 lines) is the hexagon's edge. **Notice** that the contract lives in the TSDoc, not just the types — never throws, pure with respect to its inputs, no filesystem access, positions 1-based and end-exclusive. Core declares the AST shape _it_ needs (`AstNode`: type, position, text, children) and never imports a parser library. Eleven ports live in this directory; `@argus/testing` ships an in-memory fake for every one.

> **One trap, worth 30 seconds now.** `domain/finding.ts` sits right next to `violation.ts` and is **not** part of the rule path. A `Finding` is raw output from an _external tool adapter_ (jscpd, Semgrep — Phase 4, none built yet). A built-in rule never produces one. Rules produce `Violation`s, by the route in stop 4.

## 3 · The adapter pattern — [`packages/ast/`](../../packages/ast/README.md) · 3 min

`@argus/ast` is the first port implemented for real: tree-sitter, running as WebAssembly ([ADR-0005](../adr/0005-ast-adapter-wasm-tree-sitter.md)), behind `AstParserPort`.

**Notice where the impedance mismatch gets absorbed.** Tree-sitter reports 0-based row/column; the domain speaks 1-based end-exclusive `Position` (ADR-0004). [`convert.ts`](../../packages/ast/src/convert.ts) does the `+ 1` and is contract-tested on it. That single conversion is the whole point of a port: the domain never learns what a tree-sitter node is, and swapping the parser would change nothing in `core`. Every adapter you write later has this same job — translate at the boundary, keep the domain ignorant.

## 4 · One rule, end to end — `packages/rules-builtin/` · 4 min

Follow `style/no-wildcard-imports` through its four artifacts, in this order:

1. **The fixtures are the spec** — [`tests/fixtures/style/no-wildcard-imports/`](../../packages/rules-builtin/tests/fixtures/style/no-wildcard-imports), six `valid/` files and six `invalid/` ones. They are written **first**; `valid/` must produce zero violations and `invalid/` at least one, and the harness enforces ≥5 of each. The file extension picks the parse language. Fixtures are data, deliberately excluded from ESLint, Prettier and tsconfig — a formatter touching them would change the line counts the length rules measure.
2. **The rule** — [`src/style/no-wildcard-imports.ts`](../../packages/rules-builtin/src/style/no-wildcard-imports.ts), 30 lines. **Notice** it subscribes to exactly one grammar node type and calls `context.report({ message, position })`. Notice too that the TSDoc explains _why_ `namespace_import` and not the `*` token — `export * from` is a legitimate barrel-file idiom and must not be flagged. Node types are the grammar's vocabulary, so inspect a real tree before guessing at one.
3. **The test** — [`tests/no-wildcard-imports.test.ts`](../../packages/rules-builtin/tests/no-wildcard-imports.test.ts), 27 lines: one `fixtureSuite(...)` line to run every fixture, then the handful of cases fixtures express poorly. It runs through a **real** engine and a real parser. Nothing of our own is mocked.
4. **What the engine does with the report** — one walk per file, dispatching by node type to every subscribed rule. The rule does not construct a `Violation`, does not pick the severity, and does not know what else is running. The engine attaches the activation's severity, the layer, and a **deterministic id** built from file, rule, position and ordinal ([`violation-id.ts`](../../packages/rule-engine/src/violation-id.ts)) — which is why the same commit always yields byte-identical output.

So the real path is **fixture → rule → `report` → `Violation`**. Adding a rule means a new file, its fixtures, its test, and one catalogue entry — the engine never changes.

## 5 · What stops you breaking it — 2 min

**Notice that the layering in stop 1 is not a convention you are asked to respect — it is a build failure if you don't.** [`dependency-cruiser-rules.cjs`](../../dependency-cruiser-rules.cjs) runs as the `boundaries` job on every PR: core importing anything but `neverthrow` fails, a deep import that bypasses a package's public `exports` fails, `packages/` importing `apps/` fails. Every one of those rules was negative-tested — deliberately violated to prove it fires, then reverted.

On top of that, CI runs Argus over Argus on every PR and fails on any finding. The rule you write in `rules-builtin` will be applied to `rules-builtin`.

The rest of the loop — the gates, the independent review pass, why only a human merges — is [`../workflow.md`](../workflow.md).

## Now do the recipe

[`adding-a-rule.md`](./adding-a-rule.md) is the next thing to open, and after this tour it should read as instructions rather than as new concepts. Fixtures first.

If something here didn't land, the depth is in the package READMEs — each one states what its package is for and what its public surface is.
