import { fix } from "@argus/core";
import type { AstNode, Fix } from "@argus/core";
import { spanning } from "../support.js";

/** One top-level import statement plus the classification the rule needs. */
export interface ImportEntry {
  readonly node: AstNode;
  /** Index into `program.children` — used to detect contiguity for the fix. */
  readonly childIndex: number;
  readonly source: string;
  readonly group: 0 | 1 | 2;
}

/**
 * A whole-block reordering fix, when it is provably safe. Four conditions
 * gate it, all required because a rule sees only the AST (`AstNode` never
 * exposes raw source or byte offsets — P1-03 scope limit) and must
 * reconstruct inter-statement whitespace from line numbers alone:
 *
 * 1. **Contiguous:** every `program` child between the first and last import
 *    (inclusive) must itself be an import statement. Comments are separate
 *    sibling nodes in this grammar, not trivia attached to a statement — a
 *    comment sitting between two imports would be silently stranded in its
 *    original spot if the statements moved around it. Declining here is what
 *    keeps the "never destroys comments" bar honest.
 * 2. **No comment abutting the block with no blank line between them** —
 *    on the first/last import's own line, or the line directly above/below.
 *    Such a comment sits *outside* the `[first, last]` window condition 1
 *    checks, so contiguity alone lets the block reorder out from under it —
 *    the comment is not destroyed, but it silently ends up describing a
 *    different import, which is the same harm (independent review, #39
 *    HIGH-3 — reproduced both leading and trailing; the own-line-above form,
 *    which covers every line-scoped directive comment, in the follow-up
 *    review — see {@link abuttingComment}).
 * 3. **No side-effect-only import** (`import "./polyfill.js";` — an
 *    `import_statement` with a source but no `import_clause`). Its entire
 *    contract is *when* it runs relative to the other imports, so moving it
 *    across a group boundary is precisely the change that breaks it. The
 *    "we only move between groups, never within" argument is inverted for
 *    these (review #39 MEDIUM-1 — reproduced).
 * 4. **One import per line:** every adjacent pair must be on different
 *    lines. The gap between two imports is reconstructed as
 *    `"\n".repeat(nextStartLine - prevEndLine)` — exact for one-per-line
 *    code (and it faithfully preserves existing blank-line grouping, not
 *    just single newlines) but not representable at all when two imports
 *    share a line, since nothing captures the text of that shared line.
 *
 * Gaps are reused **positionally** (the gap that separated original
 * positions *i* and *i+1* separates whatever ends up at sorted positions *i*
 * and *i+1*), not reattached to specific imports — there is one fewer gap
 * than there are imports, so gaps belong to slots in the sequence, not to
 * the statements passing through them.
 */
export function computeBlockFix(
  program: AstNode,
  entries: readonly ImportEntry[],
): Fix | undefined {
  const first = entries[0];
  const last = entries[entries.length - 1];
  if (first === undefined || last === undefined) {
    // Unreachable by construction: the only caller passes `entries` after
    // finding at least one entry in `toReport`, so it is never empty here.
    // `noUncheckedIndexedAccess` still requires the narrowing.
    return undefined;
  }
  if (last.childIndex - first.childIndex !== entries.length - 1) {
    return undefined; // something else sits between the first and last import
  }
  if (abuttingComment(program, first, last)) {
    return undefined; // a comment on the block's own first/last line would be left behind
  }
  if (entries.some((entry) => isSideEffectOnly(entry.node))) {
    return undefined; // reordering a bare `import "…"` changes evaluation order
  }
  const gapLines = measureGaps(entries, first);
  if (gapLines === undefined) {
    return undefined; // two imports share a line — gap isn't reconstructible
  }

  return fix({
    position: spanning(first.node.position, last.node.position),
    replacement: reorderedText(entries, gapLines),
  })._unsafeUnwrap();
}

/**
 * Blank-line counts separating each adjacent pair, or `undefined` if any pair
 * shares a line. One shorter than `entries`: gaps belong to the slots between
 * imports, not to the imports themselves.
 */
function measureGaps(entries: readonly ImportEntry[], first: ImportEntry): number[] | undefined {
  const gapLines: number[] = [];
  let previous = first;
  for (const entry of entries.slice(1)) {
    const lines = entry.node.position.startLine - previous.node.position.endLine;
    if (lines < 1) {
      return undefined;
    }
    gapLines.push(lines);
    previous = entry;
  }
  return gapLines;
}

/** The block rewritten in group order, reusing each gap in its original slot. */
function reorderedText(entries: readonly ImportEntry[], gapLines: readonly number[]): string {
  return [...entries]
    .sort((a, b) => a.group - b.group)
    .map((entry, i) => {
      if (i === 0) {
        return entry.node.text;
      }
      const gap = gapLines[i - 1];
      if (gap === undefined) {
        // Unreachable by construction: gapLines has exactly entries.length - 1
        // members (one per adjacent original pair) and the sorted list has the
        // same length as entries, so every i >= 1 has a corresponding gap.
        throw new Error("internal: import-order fix gap/entry count mismatch");
      }
      return "\n".repeat(gap) + entry.node.text;
    })
    .join("");
}

/**
 * True when a comment sits against the block with no blank line between them —
 * either on the first import's own line or the line directly above it, or on
 * the last import's own line or the line directly below it. Such a comment is
 * outside the contiguity window, so the block would otherwise reorder out from
 * under it and leave it describing a different statement.
 *
 * The **line directly above** is the load-bearing half. Every line-scoped
 * directive comment — `eslint-disable-next-line`, `@ts-expect-error`,
 * `biome-ignore`, `prettier-ignore`, `istanbul ignore next` — binds to the
 * next line by definition, so reordering below one does not merely reword a
 * description: it moves a suppression onto a statement that never needed it.
 * With `@ts-expect-error` that is a compile break in both directions (`TS2578`
 * on the new target, the original error resurfacing), turning a compiling
 * project into a non-compiling one at exit `0`.
 *
 * A blank line is the signal that the comment is free-floating rather than
 * attached, so a file header followed by a blank line still gets fixed. A
 * header sitting flush against the imports is indistinguishable from a
 * directive here, and declining is cheap (ADR-0006 decision 2).
 */
function abuttingComment(program: AstNode, first: ImportEntry, last: ImportEntry): boolean {
  const before = program.children[first.childIndex - 1];
  if (
    before?.nodeType === "comment" &&
    before.position.endLine >= first.node.position.startLine - 1
  ) {
    return true;
  }
  const after = program.children[last.childIndex + 1];
  return (
    after?.nodeType === "comment" && after.position.startLine <= last.node.position.endLine + 1
  );
}

/**
 * True for a bare `import "./x.js";` — the grammar gives it a `source` but no
 * `import_clause` (verified against the pinned TS/JS grammars: every binding
 * form, `import type` included, carries one).
 */
function isSideEffectOnly(importStatement: AstNode): boolean {
  return !importStatement.children.some((child) => child.nodeType === "import_clause");
}
