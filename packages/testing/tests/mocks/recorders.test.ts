import { NotificationError, type ScanEvent } from "@argus/core";
import { describe, expect, it } from "vitest";
import { RecordingNotificationPort } from "../../src/mocks/recording-notification-port.js";
import { RecordingProgressReporter } from "../../src/mocks/recording-progress-reporter.js";
import { someCompletedScan, someFilePath, someScanId } from "./helpers.js";

describe("RecordingNotificationPort", () => {
  it("records delivered events in order", async () => {
    const port = new RecordingNotificationPort();
    const event: ScanEvent = { kind: "scan-completed", scan: someCompletedScan() };
    (await port.notify(event))._unsafeUnwrap();
    expect(port.events).toEqual([event]);
  });

  it("failNextWith drops the undelivered event and fails only once", async () => {
    const port = new RecordingNotificationPort();
    const error = new NotificationError("webhook 503");
    port.failNextWith(error);
    const event: ScanEvent = { kind: "scan-completed", scan: someCompletedScan() };
    expect((await port.notify(event))._unsafeUnwrapErr()).toBe(error);
    expect(port.events).toEqual([]);
    (await port.notify(event))._unsafeUnwrap();
    expect(port.events).toEqual([event]);
  });
});

describe("RecordingProgressReporter", () => {
  it("records the full call sequence in order", () => {
    const reporter = new RecordingProgressReporter();
    const scanId = someScanId();
    const file = someFilePath();
    reporter.scanStarted(scanId, 2);
    reporter.fileScanned(scanId, file);
    reporter.scanFinished(scanId);
    expect(reporter.calls).toEqual([
      { kind: "scan-started", scanId, totalFiles: 2 },
      { kind: "file-scanned", scanId, file },
      { kind: "scan-finished", scanId },
    ]);
  });
});
