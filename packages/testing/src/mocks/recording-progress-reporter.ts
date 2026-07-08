import type { FilePath, ProgressReporterPort, ScanId } from "@argus/core";

/** One recorded progress call, discriminated by `kind` in call order. */
export type ProgressCall =
  | { readonly kind: "scan-started"; readonly scanId: ScanId; readonly totalFiles: number }
  | { readonly kind: "file-scanned"; readonly scanId: ScanId; readonly file: FilePath }
  | { readonly kind: "scan-finished"; readonly scanId: ScanId };

/**
 * `ProgressReporterPort` that records every call in `calls` (a live view).
 * Never fails — the port contract forbids throwing, so there is no
 * failure injection to offer.
 */
export class RecordingProgressReporter implements ProgressReporterPort {
  private readonly recorded: ProgressCall[] = [];

  get calls(): readonly ProgressCall[] {
    return this.recorded;
  }

  scanStarted(scanId: ScanId, totalFiles: number): void {
    this.recorded.push({ kind: "scan-started", scanId, totalFiles });
  }

  fileScanned(scanId: ScanId, file: FilePath): void {
    this.recorded.push({ kind: "file-scanned", scanId, file });
  }

  scanFinished(scanId: ScanId): void {
    this.recorded.push({ kind: "scan-finished", scanId });
  }
}
