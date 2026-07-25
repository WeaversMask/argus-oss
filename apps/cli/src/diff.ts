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

  const CONTEXT = 3;
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

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

  const removed = beforeLines.slice(prefix, beforeLines.length - suffix);
  const added = afterLines.slice(prefix, afterLines.length - suffix);
  const contextBefore = beforeLines.slice(Math.max(0, prefix - CONTEXT), prefix);
  const contextAfter = beforeLines.slice(
    beforeLines.length - suffix,
    beforeLines.length - suffix + CONTEXT,
  );

  const oldStart = Math.max(0, prefix - CONTEXT) + 1;
  const oldCount = contextBefore.length + removed.length + contextAfter.length;
  const newCount = contextBefore.length + added.length + contextAfter.length;

  const lines = [
    `--- ${file}`,
    `+++ ${file}`,
    `@@ -${oldStart},${oldCount} +${oldStart},${newCount} @@`,
    ...contextBefore.map((line) => ` ${line}`),
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
    ...contextAfter.map((line) => ` ${line}`),
  ];
  return `${lines.join("\n")}\n`;
}
