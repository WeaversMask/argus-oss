/**
 * `@argus/orchestrator` — what a scan covers.
 *
 * The package answers scope questions that are neither domain rules nor
 * wiring: today, "which files and lines did this branch change, and which of
 * these violations land on them?" ({@link extractChangeSet},
 * {@link filterToChangedLines}). An app supplies the I/O; the decisions live
 * here.
 */

export type { ChangeSet, FileChange, LineRange } from "./change-set.js";
export { extractChangeSet } from "./diff-extractor.js";
export type { GitRunner } from "./diff-extractor.js";
export { filterToChangedLines } from "./diff-filter.js";
