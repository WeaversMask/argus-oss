import { err, ok, type Result } from "neverthrow";
import type { Project, ProjectId, ProjectRepositoryPort, RepositoryError } from "@argus/core";

/**
 * Map-backed `ProjectRepositoryPort`: upserts by `project.id`, `list`
 * returns first-save order. Failure injection as in
 * `InMemoryScanRepository`.
 */
export class InMemoryProjectRepository implements ProjectRepositoryPort {
  private readonly projects = new Map<ProjectId, Project>();
  private nextError: RepositoryError | undefined;

  failNextWith(error: RepositoryError): void {
    this.nextError = error;
  }

  private takeError(): RepositoryError | undefined {
    const error = this.nextError;
    this.nextError = undefined;
    return error;
  }

  save(project: Project): Promise<Result<void, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    this.projects.set(project.id, project);
    return Promise.resolve(ok(undefined));
  }

  findById(id: ProjectId): Promise<Result<Project | undefined, RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.projects.get(id)));
  }

  list(): Promise<Result<readonly Project[], RepositoryError>> {
    const error = this.takeError();
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(Object.freeze([...this.projects.values()])));
  }
}
