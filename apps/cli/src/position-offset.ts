import type { Position } from "@argus/core";

/**
 * Converts 1-based line/column positions (ADR-0004: end-exclusive, UTF-16
 * code units) into 0-based character offsets into `source` — what
 * `magic-string` needs to splice text, and what `AstNode` never exposes
 * (P1-03 scope limit: byte offsets were deliberately deferred from the AST
 * port until a real consumer needed them). Built once per file; every
 * position in that file shares the one line-start table rather than
 * rescanning `source` per query.
 */
export class LineIndex {
  private readonly lineStarts: readonly number[];

  constructor(source: string) {
    const starts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "\n") {
        starts.push(i + 1);
      }
    }
    this.lineStarts = starts;
  }

  /** The character offset of `line:column` (both 1-based). Throws if `line` is out of range. */
  offsetOf(line: number, column: number): number {
    const lineStart = this.lineStarts[line - 1];
    if (lineStart === undefined) {
      throw new RangeError(
        `line ${line} is out of range (source has ${this.lineStarts.length} lines)`,
      );
    }
    return lineStart + (column - 1);
  }

  /** The `[start, end)` character offset range spanned by `position`. */
  offsetsOf(position: Position): readonly [start: number, end: number] {
    return [
      this.offsetOf(position.startLine, position.startColumn),
      this.offsetOf(position.endLine, position.endColumn),
    ];
  }
}
