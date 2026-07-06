import { err, ok, type Result } from "neverthrow";
import { ValidationError, type ValidationIssue } from "../errors/validation-error.js";

/**
 * Collects field-level issues for one factory call and converts them into a
 * single `Result`. Internal plumbing for `@argus/core` factories — not
 * exported from the package barrel.
 */
export class Validator {
  private readonly issues: ValidationIssue[] = [];

  constructor(private readonly context: string) {}

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  /** Rejects strings that are empty or whitespace-only. */
  nonBlankString(path: string, value: string): void {
    if (value.trim().length === 0) {
      this.add(path, "must be a non-empty string");
    }
  }

  integerAtLeast(path: string, value: number, floor: number): void {
    if (!Number.isInteger(value) || value < floor) {
      this.add(path, `must be an integer >= ${floor}`);
    }
  }

  finiteAtLeast(path: string, value: number, floor: number): void {
    if (!Number.isFinite(value) || value < floor) {
      this.add(path, `must be a finite number >= ${floor}`);
    }
  }

  matches(path: string, value: string, pattern: RegExp, requirement: string): void {
    if (!pattern.test(value)) {
      this.add(path, requirement);
    }
  }

  /**
   * Re-validates an embedded component through its own factory (D-2a):
   * merges the component's issues under `path` and returns the factory's
   * frozen copy. On failure returns `fallback` — a placeholder that is
   * never built into an entity, because `toResult` will yield `err`.
   */
  embed<T>(path: string, result: Result<T, ValidationError>, fallback: T): T {
    if (result.isErr()) {
      for (const issue of result.error.issues) {
        this.add(`${path}.${issue.path}`, issue.message);
      }
      return fallback;
    }
    return result.value;
  }

  /** `err(ValidationError)` if any issue was recorded, otherwise `ok(build())`. */
  toResult<T>(build: () => T): Result<T, ValidationError> {
    return this.issues.length > 0
      ? err(new ValidationError(this.context, this.issues))
      : ok(build());
  }
}
