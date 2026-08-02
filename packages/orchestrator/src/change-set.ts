/**
 * What "the part of the project a scan covers" is, as data.
 *
 * Kept apart from both the git commands that produce it and the filter that
 * consumes it: those two have nothing to say to each other, and this is the
 * only vocabulary they share.
 */

/** A run of source lines. 1-based and inclusive at both ends. */
export interface LineRange {
  readonly start: number;
  readonly end: number;
}

/** What a diff changed in one file, expressed against the copy on disk. */
export interface FileChange {
  /**
   * Changed lines on the new side — ascending, non-overlapping, and merged
   * across adjacency. Empty when {@link whole} is `true`.
   */
  readonly ranges: readonly LineRange[];
  /**
   * `true` when git has no "before" side to compare against, i.e. the file is
   * untracked. Every line then counts as changed and nothing in it is
   * suppressed — the alternative is reporting zero violations for brand-new
   * work, which is the diff-mode equivalent of a false green.
   */
  readonly whole: boolean;
}

/**
 * The files a diff touched, keyed by path relative to the directory git ran
 * in, `/`-separated.
 *
 * That directory is the scan's project root, so the keys are in the same
 * vocabulary as `Position.file` and a discovered file's relative path.
 * Files the diff touched without adding any lines (a pure deletion, a mode
 * change, a binary file) are absent rather than present-and-empty: they can
 * produce no reportable violation, so scanning them is wasted work.
 */
export type ChangeSet = ReadonlyMap<string, FileChange>;

/** Sorts and coalesces ranges, joining ones that touch as well as ones that overlap. */
export function mergeRanges(ranges: readonly LineRange[]): readonly LineRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: LineRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end + 1) {
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, range.end) };
      continue;
    }
    merged.push(range);
  }
  return merged;
}
