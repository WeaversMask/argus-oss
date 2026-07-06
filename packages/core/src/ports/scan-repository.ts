import type { Result } from "neverthrow";
import type { ProjectId, ScanId } from "../domain/ids.js";
import type { Scan } from "../domain/scan.js";
import type { RepositoryError } from "../errors/repository-error.js";

/**
 * Persists scans across their whole lifecycle.
 *
 * Contract (all repository ports):
 * - Never throws; storage trouble becomes a `RepositoryError` naming the
 *   failed operation.
 * - Absence is not an error: lookups resolve to `ok(undefined)` / `ok([])`.
 * - Returned entities are the frozen domain objects that were saved;
 *   implementations must not hand back mutable copies.
 *
 * Scan-specific:
 * - `save` upserts by `scan.id` — callers persist each lifecycle state
 *   (queued → running → completed/failed) and the latest state wins.
 * - `findByProject` returns scans in first-save order.
 */
export interface ScanRepositoryPort {
  save(scan: Scan): Promise<Result<void, RepositoryError>>;
  findById(id: ScanId): Promise<Result<Scan | undefined, RepositoryError>>;
  findByProject(projectId: ProjectId): Promise<Result<readonly Scan[], RepositoryError>>;
}
