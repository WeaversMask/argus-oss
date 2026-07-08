import type { Result } from "neverthrow";
import type { FilePath } from "../domain/file-path.js";
import type { ResolutionError } from "../errors/resolution-error.js";

/** The intra-project files one file imports from. */
export interface FileDependencies {
  readonly file: FilePath;
  /**
   * Project-relative paths of imported files, in import order, duplicates
   * removed. Only intra-project imports appear — bare specifiers (npm
   * packages, stdlib) are omitted; layer enforcement has no use for them.
   */
  readonly imports: readonly FilePath[];
}

/**
 * Extracts a file's import edges for layer-boundary enforcement (P3).
 *
 * Contract:
 * - Never throws; unreadable or unparseable input becomes a `ResolutionError`.
 * - Pure with respect to inputs: the caller supplies `source`; resolving
 *   specifiers to project-relative paths may consult project layout the
 *   implementation was constructed with, but not the network.
 * - A file with no imports resolves to `ok` with an empty list.
 * - Dynamic imports with non-literal specifiers may be skipped; the
 *   implementation documents what it can and cannot see.
 */
export interface DependencyResolverPort {
  resolve(file: FilePath, source: string): Promise<Result<FileDependencies, ResolutionError>>;
}
