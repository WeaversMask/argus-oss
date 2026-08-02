import type { Position, Violation } from "@argus/core";
import type { ChangeSet } from "./change-set.js";

/**
 * Diff mode's second half: narrowing a completed scan's violations to the
 * lines the diff touched.
 *
 * Restricting *discovery* to changed files is not enough on its own. A file
 * with a one-line edit is still parsed and analysed whole, so it still
 * reports every pre-existing violation in it — which is exactly the noise
 * diff mode exists to remove.
 */

/**
 * The violations that overlap a changed line, in their original order.
 *
 * A violation counts as overlapping when *any* line it spans is a changed
 * line — containment would be the wrong test, because a rule like
 * `quality/max-function-length` reports against a whole function, and
 * changing three lines inside a long function is precisely the moment its
 * length is worth raising.
 *
 * A violation in a file outside `changes` is dropped. In a scan whose file
 * list was already narrowed to `changes` that cannot happen, but the two
 * narrowings are independent and this one does not assume the other ran.
 */
export function filterToChangedLines(
  violations: readonly Violation[],
  changes: ChangeSet,
): readonly Violation[] {
  return violations.filter((violation) => isOnChangedLine(violation.position, changes));
}

function isOnChangedLine(position: Position, changes: ChangeSet): boolean {
  const change = changes.get(position.file);
  if (change === undefined) {
    return false;
  }
  if (change.whole) {
    return true;
  }
  const lastLine = lastLineOf(position);
  return change.ranges.some((range) => range.start <= lastLine && range.end >= position.startLine);
}

/**
 * The last line a position actually occupies.
 *
 * Positions are end-exclusive over (line, column) pairs (ADR-0004), so a
 * range ending at column 1 of line N stops at the very start of that line
 * and covers nothing on it — counting N would let an edit on the blank line
 * after a construct resurrect a violation that ends above it.
 */
function lastLineOf(position: Position): number {
  return position.endColumn === 1 && position.endLine > position.startLine
    ? position.endLine - 1
    : position.endLine;
}
