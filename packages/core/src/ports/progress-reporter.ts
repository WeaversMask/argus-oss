import type { FilePath } from "../domain/file-path.js";
import type { ScanId } from "../domain/ids.js";

/**
 * Live progress feedback for one scan (CLI spinner, server-sent events, …).
 *
 * Contract:
 * - Fire-and-forget: methods return `void` and **must not throw** — a
 *   broken progress display must never break the scan. Swallow and log.
 * - The caller guarantees ordering per scan: one `scanStarted`, then zero
 *   or more `fileScanned`, then exactly one `scanFinished` — also after
 *   failures, so displays always get closure.
 * - `totalFiles` is the planned file count; implementations must tolerate
 *   `fileScanned` arriving fewer times than announced (skips, failures).
 */
export interface ProgressReporterPort {
  scanStarted(scanId: ScanId, totalFiles: number): void;
  fileScanned(scanId: ScanId, file: FilePath): void;
  scanFinished(scanId: ScanId): void;
}
