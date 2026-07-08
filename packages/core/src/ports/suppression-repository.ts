import type { Result } from "neverthrow";
import type { ProjectId } from "../domain/ids.js";
import type { Suppression } from "../domain/suppression.js";
import type { RepositoryError } from "../errors/repository-error.js";

/**
 * Persists suppressions **scoped by project at the query level** — the
 * entity itself stays project-agnostic (ADR-0004, D-4a): a suppression
 * belongs to a project because it came from that project's config file,
 * so the association is contextual, not intrinsic.
 *
 * Shares the repository contract documented on `ScanRepositoryPort`
 * (no throws, absence is `[]`, frozen entities back).
 *
 * - `saveForProject` replaces the project's complete suppression set —
 *   config-file reload semantics. Idempotent for identical input.
 * - `findForProject` returns suppressions in saved (config-file) order,
 *   including expired ones — expiry is evaluated by the domain service
 *   (`isSuppressionExpired` / P1-06 `SuppressionEvaluator`), never by
 *   the store.
 */
export interface SuppressionRepositoryPort {
  saveForProject(
    projectId: ProjectId,
    suppressions: readonly Suppression[],
  ): Promise<Result<void, RepositoryError>>;
  findForProject(projectId: ProjectId): Promise<Result<readonly Suppression[], RepositoryError>>;
}
