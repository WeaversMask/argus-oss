import type { Result } from "neverthrow";
import type { FilePath } from "../domain/file-path.js";
import type { Position } from "../domain/position.js";
import type { ParseError } from "../errors/parse-error.js";

export const LANGUAGES = Object.freeze(["typescript", "javascript", "python"] as const);

export type Language = (typeof LANGUAGES)[number];

/**
 * The minimal AST view the domain needs. Implementations (tree-sitter in
 * `@argus/ast`, P1-03) conform to this shape — the dependency points
 * inward; core never imports an AST library. Richer traversal (visitors,
 * queries) lives with the implementation, not in this contract.
 *
 * Shape ruled by the maintainer on the #13 review finding (2026-07-07):
 * field labels are IN (`fieldName` — rules need named-child access);
 * parent links and byte offsets are DEFERRED until a real consumer
 * demands them (all implementations are in-repo, so later widening has a
 * contained blast radius).
 *
 * `position` follows ADR-0004: 1-based, end-exclusive. Implementations own
 * the conversion from their native coordinates (tree-sitter is 0-based)
 * and must contract-test it.
 */
export interface AstNode {
  /** Grammar node type, e.g. `"function_declaration"`. Implementation-defined vocabulary. */
  readonly nodeType: string;
  /**
   * The grammar field this node occupies in its parent (e.g. `"name"`,
   * `"body"` — tree-sitter's `childForFieldName` labels), when the grammar
   * names it. Absent for unlabelled children and the root.
   */
  readonly fieldName?: string;
  readonly position: Position;
  /** Source text this node spans. May be computed lazily via a getter. */
  readonly text: string;
  /** Direct children in source order. Empty for leaves. */
  readonly children: readonly AstNode[];
}

/** A successfully parsed source file: the root node plus its identity. */
export interface ParsedFile {
  readonly file: FilePath;
  readonly language: Language;
  readonly root: AstNode;
}

/**
 * Parses source text into the domain's AST view.
 *
 * Contract:
 * - Never throws; every failure is a `ParseError` in the `Result`.
 * - Pure with respect to inputs: same `(file, source, language)` yields an
 *   equivalent tree. No filesystem access — the caller supplies `source`.
 * - `language` must be one of `languages`; passing an unsupported one is a
 *   programming error and implementations may reject it as a `ParseError`.
 * - Recoverable syntax errors are the implementation's call: it may return
 *   a best-effort tree (tree-sitter does) — a `ParseError` is for input it
 *   cannot represent at all.
 */
export interface AstParserPort {
  /** Languages this parser accepts. Check before calling `parse`. */
  readonly languages: readonly Language[];
  parse(
    file: FilePath,
    source: string,
    language: Language,
  ): Promise<Result<ParsedFile, ParseError>>;
}
