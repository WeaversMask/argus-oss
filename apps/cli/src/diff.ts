/**
 * Renders a unified diff between two versions of one file's text, for
 * `argus fix --dry-run`.
 *
 * Finds the common leading and trailing lines and reports everything
 * between them as one changed hunk with a few lines of context — it does
 * not attempt a minimal multi-hunk diff (Myers/LCS) for changes scattered
 * across unrelated regions of the same file. That is deliberately more than
 * this task needs: every fix `apply-fixes.ts` can produce today replaces
 * one contiguous span, so the changed region is already contiguous and a
 * single hunk is exact, not an approximation. Revisit if a future fixable
 * rule can touch disjoint regions of one file well enough that showing them
 * as one hunk gets genuinely noisy.
 */
export function unifiedDiff(file: string, before: string, after: string): string {
  if (before === after) {
    return "";
  }

  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const span = changedSpan(beforeLines, afterLines);

  const removed = beforeLines.slice(span.prefix, beforeLines.length - span.suffix);
  const added = afterLines.slice(span.prefix, afterLines.length - span.suffix);
  const contextBefore = beforeLines.slice(Math.max(0, span.prefix - CONTEXT), span.prefix);
  const contextAfter = beforeLines.slice(
    beforeLines.length - span.suffix,
    beforeLines.length - span.suffix + CONTEXT,
  );

  const oldStart = Math.max(0, span.prefix - CONTEXT) + 1;
  const context = contextBefore.length + contextAfter.length;

  // A hunk whose changed region runs to the end of the file must mark either
  // side that lacks a trailing newline, or the patch cannot apply cleanly.
  // Only reachable when `suffix === 0`; when the tail is shared context, both
  // sides end identically and no marker is needed.
  const atEof = span.suffix === 0;

  return `${[
    `--- ${file}`,
    `+++ ${file}`,
    `@@ -${oldStart},${context + removed.length} +${oldStart},${context + added.length} @@`,
    ...contextBefore.map((line) => ` ${line}`),
    ...removed.map((line) => `-${line}`),
    ...(atEof && removed.length > 0 && !before.endsWith("\n") ? [NO_NEWLINE] : []),
    ...added.map((line) => `+${line}`),
    ...(atEof && added.length > 0 && !after.endsWith("\n") ? [NO_NEWLINE] : []),
    ...contextAfter.map((line) => ` ${line}`),
  ].join("\n")}\n`;
}

const CONTEXT = 3;
const NO_NEWLINE = "\\ No newline at end of file";

/** How many leading and trailing lines the two versions share. */
function changedSpan(
  beforeLines: readonly string[],
  afterLines: readonly string[],
): { readonly prefix: number; readonly suffix: number } {
  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  const maxSuffix = Math.min(beforeLines.length, afterLines.length) - prefix;
  while (
    suffix < maxSuffix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  return { prefix, suffix };
}

/**
 * Source lines, without the empty string `split("\n")` leaves behind for a
 * newline-terminated file. Counting that phantom element rendered a bare `" "`
 * context line and inflated both hunk counts by one, so every emitted diff was
 * an unappliable patch (independent review, #39 MEDIUM-2 — reproduced against
 * `git apply`).
 */
function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}
