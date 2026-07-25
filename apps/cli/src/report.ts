import type { Violation } from "@argus/core";

/** A file that could not be parsed or whose rule run failed. */
export interface ScanFailure {
  /** Display path of the offending file. */
  readonly file: string;
  readonly message: string;
}

/**
 * Everything a formatter needs to render one scan's outcome.
 *
 * `failures` is part of the report, not a side channel: every formatter must
 * keep telling the truth about files that could not be analysed, so a partial
 * scan can never read as a clean one.
 */
export interface ScanReport {
  readonly violations: readonly Violation[];
  readonly failures: readonly ScanFailure[];
  readonly filesScanned: number;
}
