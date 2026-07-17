# `@argus/ast`

> The tree-sitter adapter behind core's `AstParserPort` — the first real port implementation in the repo. Parses TypeScript, JavaScript, and Python into the domain's frozen `AstNode` view.

## Purpose

`ast` owns everything tree-sitter: loading the wasm engine and grammars, parsing source text, and converting tree-sitter's view of the world into core's (`AstNode`/`ParsedFile`, 1-based end-exclusive `Position`s per ADR-0004). It conforms **inward** — core defines the contract and never sees a tree-sitter type. It also owns the richer traversal the port deliberately excludes: a visitor and S-expression query helpers. It does **not** decide what to do with trees (that's the rule engine, P1-04) and performs no filesystem discovery — callers supply source text; the only I/O is reading grammar wasm files out of `node_modules`.

Runs tree-sitter's **wasm build** ([ADR-0005](../../docs/adr/0005-ast-adapter-wasm-tree-sitter.md)): no native compiles, no dependency install scripts (the grammar packages' `node-gyp-build` scripts are pinned to reviewed-and-denied in `pnpm-workspace.yaml`).

## Public surface

| Export                                       | Kind             | Summary                                                                                                                                        |
| -------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `TreeSitterAstParser` (`…Options`)           | class            | Implements `AstParserPort.parse`; also `parseDocument` for query access. Lazy engine/grammar init, per-instance caches, never throws           |
| `AstDocument` (`QueryMatch`, `QueryCapture`) | class            | A parsed file that can still run S-expression queries; holds wasm memory — **callers must `dispose()`**. Captures are the identical `AstNode`s |
| `visit`, `Visitor`, `VisitControl`           | function + types | Depth-first `enter`/`exit` walk over any `AstNode` subtree; `"skip"` skips children, `"stop"` aborts; iterative (deep trees can't overflow)    |
| `QueryError`                                 | error            | `DomainError` (`code: "ast/query"`) for malformed/disposed queries                                                                             |
| `grammarWasmPath`                            | function         | Where a language's prebuilt grammar wasm lives — useful for bundler overrides                                                                  |

## How it fits

- **Depends on:** `@argus/core` (the contract it implements), `neverthrow`, `web-tree-sitter` + `tree-sitter-{typescript,javascript,python}` (external, MIT, exact-pinned — the wasm artifacts are the only parts used).
- **Consumed by:** the rule engine (P1-04) and anything needing source trees.
- **Boundary rules:** imports land on `@argus/core`'s public entry only; other packages import `@argus/ast`'s public entry only (`ast-public-entry-only` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)).

## Usage

```ts
import { filePath } from "@argus/core";
import { TreeSitterAstParser, visit } from "@argus/ast";

const parser = new TreeSitterAstParser();
const file = filePath("src/example.ts")._unsafeUnwrap();

const parsed = await parser.parse(file, "const a = 1;", "typescript");
parsed.map(({ root }) =>
  visit(root, {
    enter: (node) => {
      if (node.nodeType === "identifier") console.log(node.text, node.position.startLine);
    },
  }),
);

// Queries need the live tree — parseDocument + dispose:
const doc = (await parser.parseDocument(file, "const a = 1;", "typescript"))._unsafeUnwrap();
try {
  const matches = doc.query("(identifier) @id")._unsafeUnwrap();
} finally {
  doc.dispose();
}
```

## Maintenance notes

- **Coordinates:** tree-sitter is 0-based; the domain is 1-based end-exclusive — `convert.ts` applies a uniform `+1` to all four numbers, contract-tested against known coordinates (in-range off-by-ones pass validation, so only those tests catch a regression — ADR-0004 residual risk). Columns/indices count **UTF-16 code units** (matches JS string indexing and LSP's default), pinned by test.
- **Grammar bumps:** exact-pin, then run the per-language smoke tests — they catch vocabulary drift and engine/grammar ABI breaks on update day. New language? Follow [`docs/dev/adding-a-language.md`](../../docs/dev/adding-a-language.md).
- **Performance:** `tests/perf/parse-benchmark.test.ts` asserts the P1-03 acceptance number (1000-line TS < 100ms locally; 500ms budget on CI runners). Last recorded: median 13.2ms on M2.
- **Memory:** only `AstDocument` holds wasm memory. `parse()` frees everything before returning; `parseDocument()` callers own `dispose()` (idempotent; `parsed` stays valid after).
- **Uncovered defensive branches** (parser's `tree === null`, document's id-map miss): unreachable by construction, kept for the never-throws contract.
- Private workspace package; not published.
