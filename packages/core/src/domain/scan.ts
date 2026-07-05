import { err, ok, type Result } from "neverthrow";
import { ScanTransitionError } from "../errors/scan-transition-error.js";
import type { ValidationError } from "../errors/validation-error.js";
import type { ProjectId, ScanId } from "./ids.js";
import type { Severity } from "./severity.js";
import type { Timestamp } from "./timestamp.js";
import { Validator } from "./validation.js";
import type { Violation } from "./violation.js";

export const SCAN_MODES = Object.freeze(["full", "incremental"] as const);

export type ScanMode = (typeof SCAN_MODES)[number];

/** Aggregated outcome of a completed scan. */
export interface ScanResult {
  readonly violations: readonly Violation[];
  readonly filesScanned: number;
  /** Violation counts keyed by severity; every severity key is present. */
  readonly countsBySeverity: Readonly<Record<Severity, number>>;
}

export function scanResult(input: {
  readonly violations: readonly Violation[];
  readonly filesScanned: number;
}): Result<ScanResult, ValidationError> {
  const validator = new Validator("ScanResult");
  validator.integerAtLeast("filesScanned", input.filesScanned, 0);
  return validator.toResult(() => {
    const counts: Record<Severity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    for (const violation of input.violations) {
      counts[violation.severity] += 1;
    }
    return Object.freeze({
      violations: Object.freeze([...input.violations]),
      filesScanned: input.filesScanned,
      countsBySeverity: Object.freeze(counts),
    });
  });
}

/**
 * `Scan` is a discriminated union over `status`, so illegal states are
 * unrepresentable: a queued scan has no `startedAt`, a completed scan
 * always has a `result`, and a wrong-status transition (e.g. completing a
 * queued scan) is a compile-time error — transitions take the narrow
 * member type, not `Scan`. Runtime checks cover only what types cannot:
 * timestamp ordering.
 */
interface ScanBase {
  readonly id: ScanId;
  readonly projectId: ProjectId;
  readonly mode: ScanMode;
  readonly queuedAt: Timestamp;
}

export interface QueuedScan extends ScanBase {
  readonly status: "queued";
}

export interface RunningScan extends ScanBase {
  readonly status: "running";
  readonly startedAt: Timestamp;
}

export interface CompletedScan extends ScanBase {
  readonly status: "completed";
  readonly startedAt: Timestamp;
  readonly finishedAt: Timestamp;
  readonly result: ScanResult;
}

export interface FailedScan extends ScanBase {
  readonly status: "failed";
  /** Absent when the scan failed before it ever started. */
  readonly startedAt?: Timestamp;
  readonly finishedAt: Timestamp;
  readonly failureReason: string;
}

export type Scan = QueuedScan | RunningScan | CompletedScan | FailedScan;

export type ScanStatus = Scan["status"];

/** Entry point of the lifecycle. Total — every input combination is a valid queued scan. */
export function queueScan(input: ScanBase): QueuedScan {
  return Object.freeze({
    id: input.id,
    projectId: input.projectId,
    mode: input.mode,
    queuedAt: input.queuedAt,
    status: "queued" as const,
  });
}

export function startScan(
  scan: QueuedScan,
  startedAt: Timestamp,
): Result<RunningScan, ScanTransitionError> {
  if (startedAt < scan.queuedAt) {
    return err(new ScanTransitionError(scan.id, "startedAt must not precede queuedAt"));
  }
  return ok(Object.freeze({ ...scan, status: "running" as const, startedAt }));
}

export function completeScan(
  scan: RunningScan,
  finishedAt: Timestamp,
  result: ScanResult,
): Result<CompletedScan, ScanTransitionError> {
  if (finishedAt < scan.startedAt) {
    return err(new ScanTransitionError(scan.id, "finishedAt must not precede startedAt"));
  }
  return ok(Object.freeze({ ...scan, status: "completed" as const, finishedAt, result }));
}

export function failScan(
  scan: QueuedScan | RunningScan,
  finishedAt: Timestamp,
  failureReason: string,
): Result<FailedScan, ScanTransitionError | ValidationError> {
  const validator = new Validator("FailedScan");
  validator.nonBlankString("failureReason", failureReason);
  const validated = validator.toResult(() => failureReason);
  if (validated.isErr()) {
    return err(validated.error);
  }
  const notBefore = scan.status === "running" ? scan.startedAt : scan.queuedAt;
  if (finishedAt < notBefore) {
    return err(
      new ScanTransitionError(
        scan.id,
        `finishedAt must not precede ${scan.status === "running" ? "startedAt" : "queuedAt"}`,
      ),
    );
  }
  return ok(Object.freeze({ ...scan, status: "failed" as const, finishedAt, failureReason }));
}
