import type { Result } from "neverthrow";
import type { ProjectId } from "../domain/ids.js";
import type { Project } from "../domain/project.js";
import type { RepositoryError } from "../errors/repository-error.js";

/**
 * Persists registered projects. Shares the repository contract documented
 * on `ScanRepositoryPort` (no throws, absence is `undefined`/`[]`, frozen
 * entities back).
 *
 * - `save` upserts by `project.id` (renames persist by re-saving).
 * - `list` returns projects in first-save order.
 */
export interface ProjectRepositoryPort {
  save(project: Project): Promise<Result<void, RepositoryError>>;
  findById(id: ProjectId): Promise<Result<Project | undefined, RepositoryError>>;
  list(): Promise<Result<readonly Project[], RepositoryError>>;
}
