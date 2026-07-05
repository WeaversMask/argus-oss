/**
 * Base class for all expected domain failures.
 *
 * Domain errors travel as values inside `Result` (neverthrow); nothing in
 * `@argus/core` throws them. They extend `Error` only so that stack traces
 * and `instanceof` checks work at the system edges where they are finally
 * reported.
 */
export abstract class DomainError extends Error {
  /** Stable machine-readable discriminator, e.g. `"core/validation"`. */
  abstract readonly code: string;
}
