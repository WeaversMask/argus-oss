import { err, ok, type Result } from "neverthrow";
import type { NotificationError, NotificationPort, ScanEvent } from "@argus/core";

/**
 * `NotificationPort` that records every event in `events` (a live view,
 * in delivery order). Failure injection via `failNextWith` — the failed
 * event is NOT recorded, mirroring a channel that never delivered.
 */
export class RecordingNotificationPort implements NotificationPort {
  private readonly recorded: ScanEvent[] = [];
  private nextError: NotificationError | undefined;

  get events(): readonly ScanEvent[] {
    return this.recorded;
  }

  failNextWith(error: NotificationError): void {
    this.nextError = error;
  }

  notify(event: ScanEvent): Promise<Result<void, NotificationError>> {
    const error = this.nextError;
    this.nextError = undefined;
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    this.recorded.push(event);
    return Promise.resolve(ok(undefined));
  }
}
