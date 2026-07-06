import { DomainError } from "./domain-error.js";

/**
 * An outward notification could not be delivered (`NotificationPort`).
 * Delivery failure never fails the scan that triggered it — callers log
 * and move on.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class NotificationError extends DomainError {
  override readonly name = "NotificationError";
  readonly code = "core/notification";

  constructor(message: string) {
    super(`Notification: ${message}`);
    Object.freeze(this);
  }
}
