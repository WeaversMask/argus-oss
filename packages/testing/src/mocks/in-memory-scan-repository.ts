import { err, ok, type Result } from "neverthrow";
import type { ProjectId, RepositoryError, Scan, ScanId, ScanRepositoryPort } from "@argus/core";

/**
 * Map-backed `ScanRepositoryPort`: upserts by `scan.id`, `findByProject`
 * returns first-save order. `failNextWith` makes exactly the next
 * operation fail with the given error — the test supplies the instance,
 * so this module needs no runtime imports from `@argus/core`.
 */
export class InMemoryScanRepository implements ScanRepositoryPort {
  private readonly scans = new Map<ScanId, Scan>();
  private nextError: RepositoryError | undefined;

  failNextWith(error: RepositoryError): void {
    this.nextError = error;
  }

  private takeError(): RepositoryError | undefined {
    const error = this.nextError;
    this.nextError = undefined;
    return error;
  }

  save(scan: Scan): Promise<Result<void, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    this.scans.set(scan.id, scan);
    return Promise.resolve(ok(undefined));
  }

  findById(id: ScanId): Promise<Result<Scan | undefined, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.scans.get(id)));
  }

  findByProject(projectId: ProjectId): Promise<Result<readonly Scan[], RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    const matches = [...this.scans.values()].filter((scan) => scan.projectId === projectId);
    return Promise.resolve(ok(Object.freeze(matches)));
  }
}
