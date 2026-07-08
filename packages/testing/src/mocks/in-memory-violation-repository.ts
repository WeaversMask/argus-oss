import { err, ok, type Result } from "neverthrow";
import type { RepositoryError, ScanId, Violation, ViolationRepositoryPort } from "@argus/core";

const NO_VIOLATIONS: readonly Violation[] = Object.freeze([]);

/**
 * Map-backed `ViolationRepositoryPort`: `saveForScan` replaces the scan's
 * set (never appends), unknown scans read as empty. Failure injection as
 * in `InMemoryScanRepository`.
 */
export class InMemoryViolationRepository implements ViolationRepositoryPort {
  private readonly byScan = new Map<ScanId, readonly Violation[]>();
  private nextError: RepositoryError | undefined;

  failNextWith(error: RepositoryError): void {
    this.nextError = error;
  }

  private takeError(): RepositoryError | undefined {
    const error = this.nextError;
    this.nextError = undefined;
    return error;
  }

  saveForScan(
    scanId: ScanId,
    violations: readonly Violation[],
  ): Promise<Result<void, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    this.byScan.set(scanId, Object.freeze([...violations]));
    return Promise.resolve(ok(undefined));
  }

  findByScan(scanId: ScanId): Promise<Result<readonly Violation[], RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.byScan.get(scanId) ?? NO_VIOLATIONS));
  }
}
