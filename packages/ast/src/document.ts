import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { AstNode, ParsedFile } from "@argus/core";
import { Query } from "web-tree-sitter";
import type { Language as WasmLanguage, Tree } from "web-tree-sitter";
import { QueryError } from "./errors.js";

/** One captured node of a query match, by capture name (`@name`). */
export interface QueryCapture {
  readonly name: string;
  readonly node: AstNode;
}

/** One match of one pattern of an S-expression query. */
export interface QueryMatch {
  /** Index of the pattern within the query source (0-based). */
  readonly patternIndex: number;
  readonly captures: readonly QueryCapture[];
}

/**
 * A parsed file that can still answer tree-sitter S-expression queries.
 *
 * `AstParserPort.parse` returns plain data; queries, however, need the
 * live tree-sitter tree, which lives in wasm memory that JS garbage
 * collection does not reclaim. A document therefore holds the tree and
 * **must be released with `dispose()`** when queries are done. `parsed`
 * (and every node in it) is plain frozen data and stays valid after
 * disposal.
 *
 * Captured nodes are returned as the **same** frozen `AstNode` instances
 * reachable from `parsed.root` (matched up via tree-sitter node ids), so
 * query results and visitor results can be compared by identity.
 */
export class AstDocument {
  readonly parsed: ParsedFile;
  private readonly tree: Tree;
  private readonly grammar: WasmLanguage;
  private readonly byWasmId: ReadonlyMap<number, AstNode>;
  private disposed = false;

  /** Created by `TreeSitterAstParser.parseDocument` — not directly. */
  constructor(
    parsed: ParsedFile,
    tree: Tree,
    grammar: WasmLanguage,
    byWasmId: ReadonlyMap<number, AstNode>,
  ) {
    this.parsed = parsed;
    this.tree = tree;
    this.grammar = grammar;
    this.byWasmId = byWasmId;
  }

  /** Convenience for `parsed.root`. */
  get root(): AstNode {
    return this.parsed.root;
  }

  /**
   * Runs a tree-sitter S-expression query over the whole document.
   *
   * Never throws: malformed query source (tree-sitter reports the offending
   * offset in its message) and use after `dispose()` come back as
   * `QueryError` values.
   */
  query(source: string): Result<readonly QueryMatch[], QueryError> {
    if (this.disposed) {
      return err(new QueryError("cannot query a disposed AstDocument"));
    }
    let query: Query | undefined;
    try {
      query = new Query(this.grammar, source);
      const matches = query.matches(this.tree.rootNode).map((match) =>
        Object.freeze({
          patternIndex: match.patternIndex,
          captures: Object.freeze(
            match.captures.map((capture) =>
              Object.freeze({ name: capture.name, node: this.nodeFor(capture.node.id) }),
            ),
          ),
        }),
      );
      return ok(Object.freeze(matches));
    } catch (cause) {
      return err(new QueryError(cause instanceof Error ? cause.message : String(cause)));
    } finally {
      query?.delete();
    }
  }

  /** Frees the underlying wasm tree. Idempotent. `parsed` stays valid. */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.tree.delete();
  }

  private nodeFor(wasmId: number): AstNode {
    const node = this.byWasmId.get(wasmId);
    if (node === undefined) {
      // Every node of the tree is in the map (convertTree walks it fully);
      // a miss is an implementation bug. Thrown here, surfaced as a
      // QueryError by the catch above — the never-throws contract holds.
      throw new Error(`no converted node for tree-sitter id ${String(wasmId)}`);
    }
    return node;
  }
}
