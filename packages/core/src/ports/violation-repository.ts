import type { Result } from "neverthrow";
import type { ScanId } from "../domain/ids.js";
import type { Violation } from "../domain/violation.js";
import type { RepositoryError } from "../errors/repository-error.js";

/**
 * Persists the violations a scan produced. Shares the repository contract
 * documented on `ScanRepositoryPort` (no throws, absence is `[]`, frozen
 * entities back).
 *
 * - `saveForScan` replaces the scan's complete violation set — re-running
 *   a scan overwrites, it never appends. Idempotent for identical input.
 * - `findByScan` returns violations in the order they were saved (the
 *   rule runner already emits source order).
 */
export interface ViolationRepositoryPort {
  saveForScan(
    scanId: ScanId,
    violations: readonly Violation[],
  ): Promise<Result<void, RepositoryError>>;
  findByScan(scanId: ScanId): Promise<Result<readonly Violation[], RepositoryError>>;
}
