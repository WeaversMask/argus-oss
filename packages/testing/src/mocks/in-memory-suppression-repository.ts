import { err, ok, type Result } from "neverthrow";
import type {
  ProjectId,
  RepositoryError,
  Suppression,
  SuppressionRepositoryPort,
} from "@argus/core";

const NO_SUPPRESSIONS: readonly Suppression[] = Object.freeze([]);

/**
 * Map-backed `SuppressionRepositoryPort`: `saveForProject` replaces the
 * project's set (config-file reload semantics, ADR-0004 D-4a), unknown
 * projects read as empty. Failure injection as in
 * `InMemoryScanRepository`.
 */
export class InMemorySuppressionRepository implements SuppressionRepositoryPort {
  private readonly byProject = new Map<ProjectId, readonly Suppression[]>();
  private nextError: RepositoryError | undefined;

  failNextWith(error: RepositoryError): void {
    this.nextError = error;
  }

  private takeError(): RepositoryError | undefined {
    const error = this.nextError;
    this.nextError = undefined;
    return error;
  }

  saveForProject(
    projectId: ProjectId,
    suppressions: readonly Suppression[],
  ): Promise<Result<void, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    this.byProject.set(projectId, Object.freeze([...suppressions]));
    return Promise.resolve(ok(undefined));
  }

  findForProject(projectId: ProjectId): Promise<Result<readonly Suppression[], RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.byProject.get(projectId) ?? NO_SUPPRESSIONS));
  }
}
