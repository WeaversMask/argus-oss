import { DomainError } from "./domain-error.js";

/** A single field-level problem found while validating factory input. */
export interface ValidationIssue {
  /** Dot-path of the offending field, e.g. `"startLine"` or `"layers[2].name"`. */
  readonly path: string;
  readonly message: string;
}

/**
 * Invalid input to an entity or value-object factory. Carries every issue
 * found in the input, not just the first, so callers can report them all
 * at once.
 */
export class ValidationError extends DomainError {
  override readonly name = "ValidationError";
  readonly code = "core/validation";
  readonly issues: readonly ValidationIssue[];

  constructor(context: string, issues: readonly ValidationIssue[]) {
    super(`${context}: ${issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
    this.issues = Object.freeze([...issues]);
    Object.freeze(this);
  }
}
