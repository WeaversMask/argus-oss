import type { FilePath } from "../domain/file-path.js";
import { DomainError } from "./domain-error.js";

/**
 * A file's imports could not be resolved (`DependencyResolverPort`) —
 * unreadable source, unparseable import syntax, or a broken project layout.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class ResolutionError extends DomainError {
  override readonly name = "ResolutionError";
  readonly code = "core/resolution";
  readonly file: FilePath;

  constructor(file: FilePath, message: string) {
    super(`Resolve "${file}": ${message}`);
    this.file = file;
    Object.freeze(this);
  }
}
