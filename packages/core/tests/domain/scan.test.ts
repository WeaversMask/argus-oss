import { describe, expect, it } from "vitest";
import { projectId, scanId } from "../../src/domain/ids.js";
import {
  completeScan,
  failScan,
  queueScan,
  scanResult,
  startScan,
  type CompletedScan,
  type QueuedScan,
  type RunningScan,
} from "../../src/domain/scan.js";
import { ScanTransitionError } from "../../src/errors/scan-transition-error.js";
import { ValidationError } from "../../src/errors/validation-error.js";
import { someTimestamp, someViolation } from "../fixtures.js";

const queued = (): QueuedScan =>
  queueScan({
    id: scanId("scan-1")._unsafeUnwrap(),
    projectId: projectId("argus")._unsafeUnwrap(),
    mode: "full",
    queuedAt: someTimestamp(1_000),
  });

const running = (): RunningScan => startScan(queued(), someTimestamp(1_500))._unsafeUnwrap();

const emptyResult = () => scanResult({ violations: [], filesScanned: 0 })._unsafeUnwrap();

describe("scanResult", () => {
  it("counts violations by severity with every severity key present", () => {
    const result = scanResult({
      violations: [
        someViolation("error", "v-1"),
        someViolation("error", "v-2"),
        someViolation("info", "v-3"),
      ],
      filesScanned: 12,
    })._unsafeUnwrap();
    expect(result.countsBySeverity).toEqual({ info: 1, warning: 0, error: 2, critical: 0 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.countsBySeverity)).toBe(true);
  });

  it("copies and freezes the violations list", () => {
    const violations = [someViolation()];
    const result = scanResult({ violations, filesScanned: 1 })._unsafeUnwrap();
    violations.push(someViolation("critical", "v-9"));
    expect(result.violations).toHaveLength(1);
    expect(Object.isFrozen(result.violations)).toBe(true);
  });

  it("rejects a negative filesScanned", () => {
    const error = scanResult({ violations: [], filesScanned: -1 })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["filesScanned"]);
  });
});

describe("scan lifecycle", () => {
  it("queueScan produces a frozen queued scan without start/finish fields", () => {
    const scan = queued();
    expect(scan.status).toBe("queued");
    expect("startedAt" in scan).toBe(false);
    expect(Object.isFrozen(scan)).toBe(true);
  });

  it("startScan returns a new running scan; the original stays queued", () => {
    const before = queued();
    const after = startScan(before, someTimestamp(1_000))._unsafeUnwrap();
    expect(after.status).toBe("running");
    expect(after.startedAt).toBe(1_000);
    expect(before.status).toBe("queued");
    expect(Object.isFrozen(after)).toBe(true);
  });

  it("startScan rejects a start before the scan was queued", () => {
    const error = startScan(queued(), someTimestamp(999))._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ScanTransitionError);
    expect(error.scanId).toBe("scan-1");
    expect(error.message).toContain("queuedAt");
  });

  it("completeScan attaches the result at or after startedAt", () => {
    const done: CompletedScan = completeScan(
      running(),
      someTimestamp(1_500),
      emptyResult(),
    )._unsafeUnwrap();
    expect(done.status).toBe("completed");
    expect(done.finishedAt).toBe(1_500);
    expect(done.result.filesScanned).toBe(0);
    expect(Object.isFrozen(done)).toBe(true);
  });

  it("completeScan rejects finishing before the start", () => {
    const error = completeScan(running(), someTimestamp(1_499), emptyResult())._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ScanTransitionError);
    expect(error.message).toContain("startedAt");
  });

  it("failScan works from queued, floored at queuedAt", () => {
    const failed = failScan(queued(), someTimestamp(1_000), "worker crashed")._unsafeUnwrap();
    expect(failed.status).toBe("failed");
    expect("startedAt" in failed).toBe(false);
    expect(failed.failureReason).toBe("worker crashed");
    const error = failScan(queued(), someTimestamp(999), "worker crashed")._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ScanTransitionError);
    expect(error.message).toContain("queuedAt");
  });

  it("failScan works from running, floored at startedAt", () => {
    const failed = failScan(running(), someTimestamp(1_500), "out of memory")._unsafeUnwrap();
    expect(failed.status).toBe("failed");
    expect(failed.startedAt).toBe(1_500);
    const error = failScan(running(), someTimestamp(1_499), "out of memory")._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ScanTransitionError);
    expect(error.message).toContain("startedAt");
  });

  it("failScan rejects a blank failure reason — failures must be explained", () => {
    const error = failScan(queued(), someTimestamp(2_000), "  ")._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ValidationError);
  });
});
