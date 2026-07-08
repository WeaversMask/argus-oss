import type { Result } from "neverthrow";
import type { CompletedScan, FailedScan } from "../domain/scan.js";
import type { NotificationError } from "../errors/notification-error.js";

/**
 * Terminal scan outcomes worth telling the outside world about.
 * A discriminated union so channels can format per kind; extend the union
 * rather than adding flags.
 */
export type ScanEvent =
  | { readonly kind: "scan-completed"; readonly scan: CompletedScan }
  | { readonly kind: "scan-failed"; readonly scan: FailedScan };

/**
 * Delivers scan outcomes to an outward channel (webhook, chat, mail — P2+).
 *
 * Contract:
 * - Never throws; delivery failure becomes a `NotificationError`.
 * - Failure to notify must never fail the scan it reports on — callers
 *   log the error and continue.
 * - At-most-once from the port's perspective: implementations may retry
 *   internally but callers will not re-invoke on `err`.
 */
export interface NotificationPort {
  notify(event: ScanEvent): Promise<Result<void, NotificationError>>;
}
