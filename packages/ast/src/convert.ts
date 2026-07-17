import type { AstNode, FilePath, Position } from "@argus/core";
import type { Node as WasmNode, Point, TreeCursor } from "web-tree-sitter";

/** A converted tree plus the index query capture mapping relies on. */
export interface ConvertedTree {
  readonly root: AstNode;
  /** tree-sitter node id → converted node (`AstDocument.query` uses this). */
  readonly byWasmId: ReadonlyMap<number, AstNode>;
}

/**
 * Coordinate conversion (ADR-0004): tree-sitter points are 0-based and
 * end-exclusive; domain `Position`s are 1-based and end-exclusive — a
 * uniform `+1` on all four numbers. Columns count UTF-16 code units (they
 * match `String.prototype.slice` indexing — pinned by test), the same
 * encoding LSP defaults to.
 *
 * Constructed directly instead of through core's `position()` factory:
 * this runs once per node in the hottest loop of the package, and `+1`
 * over tree-sitter's non-negative, ordered points cannot produce an
 * invalid `Position`. The conversion contract tests run the factory as an
 * oracle over every node of real trees in all three languages.
 */
function toPosition(file: FilePath, start: Point, end: Point): Position {
  return Object.freeze({
    file,
    startLine: start.row + 1,
    startColumn: start.column + 1,
    endLine: end.row + 1,
    endColumn: end.column + 1,
  });
}

/** Everything captured from the cursor before a node's children are known. */
interface Frame {
  readonly id: number;
  readonly nodeType: string;
  readonly fieldName: string | undefined;
  readonly position: Position;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly children: AstNode[];
}

/**
 * Converts a tree-sitter tree into the domain's frozen `AstNode` view.
 *
 * - **All** children are kept, anonymous ones (keywords, punctuation) and
 *   extras (comments) included — the faithful reading of the port's
 *   "direct children in source order"; `fieldName` gives named access.
 * - `text` is a lazy, memoized slice of `source` — nodes never copy their
 *   span up front (the root alone would duplicate the whole file).
 * - Iterative on an explicit stack: the port contract says "never throws",
 *   which includes not overflowing the call stack on pathologically nested
 *   input that tree-sitter itself handles fine.
 *
 * The wasm tree is only read, never retained — callers stay free to
 * `delete()` it afterwards.
 */
export function convertTree(rootNode: WasmNode, source: string, file: FilePath): ConvertedTree {
  const byWasmId = new Map<number, AstNode>();
  const cursor = rootNode.walk();
  try {
    const ancestors: Frame[] = [];
    let frame = makeFrame(cursor, file);
    for (;;) {
      if (cursor.gotoFirstChild()) {
        ancestors.push(frame);
        frame = makeFrame(cursor, file);
        continue;
      }
      // `frame` is complete (a leaf here; ancestors complete on the way up).
      for (;;) {
        const node = finalizeFrame(frame, source);
        byWasmId.set(frame.id, node);
        const parent = ancestors[ancestors.length - 1];
        if (parent === undefined) {
          return { root: node, byWasmId };
        }
        parent.children.push(node);
        if (cursor.gotoNextSibling()) {
          frame = makeFrame(cursor, file);
          break;
        }
        cursor.gotoParent(); // must succeed: `ancestors` is non-empty
        ancestors.pop();
        frame = parent;
      }
    }
  } finally {
    cursor.delete();
  }
}

function makeFrame(cursor: TreeCursor, file: FilePath): Frame {
  return {
    id: cursor.nodeId,
    nodeType: cursor.nodeType,
    fieldName: cursor.currentFieldName ?? undefined,
    position: toPosition(file, cursor.startPosition, cursor.endPosition),
    startIndex: cursor.startIndex,
    endIndex: cursor.endIndex,
    children: [],
  };
}

function finalizeFrame(frame: Frame, source: string): AstNode {
  let memo: string | undefined;
  const node = {
    nodeType: frame.nodeType,
    position: frame.position,
    children: Object.freeze(frame.children),
    get text(): string {
      return (memo ??= source.slice(frame.startIndex, frame.endIndex));
    },
  };
  // `fieldName` is conditionally *absent*, never `undefined`-valued
  // (exactOptionalPropertyTypes): unlabelled children and the root must not
  // carry the key at all.
  if (frame.fieldName !== undefined) {
    return Object.freeze(Object.assign(node, { fieldName: frame.fieldName }));
  }
  return Object.freeze(node);
}
