import { DomainError } from "./domain-error.js";

/**
 * A repository port operation failed in its storage layer (connection lost,
 * constraint violated, serialization failure, …). `operation` names the
 * port method that failed, e.g. `"save"` or `"findByProject"`. Absence of a
 * record is NOT an error — lookups model it as `undefined` in the ok value.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class RepositoryError extends DomainError {
  override readonly name = "RepositoryError";
  readonly code = "core/repository";
  readonly operation: string;

  constructor(operation: string, message: string) {
    super(`Repository ${operation}: ${message}`);
    this.operation = operation;
    Object.freeze(this);
  }
}
