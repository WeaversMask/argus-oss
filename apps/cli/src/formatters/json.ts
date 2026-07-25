import { SCAN_REPORT_CONTRACT_VERSION } from "@argus/api-contracts";
import type {
  ScanReportPayload,
  SeverityCountsPayload,
  ViolationPayload,
} from "@argus/api-contracts";
import type { Violation } from "@argus/core";
import type { ScanReport } from "../report.js";
import { CLI_VERSION } from "../version.js";

/** Indentation of the emitted document — readable in a terminal, and `jq -c` compacts it. */
const INDENT = 2;

/**
 * Renders the scan as the `@argus/api-contracts` JSON payload: one complete
 * document on stdout, newline-terminated, never coloured under any setting.
 *
 * The shape is the contract, not an implementation detail — see
 * `scanReportSchema`, which every emitted document is validated against in
 * tests. Two properties downstream tooling depends on:
 *
 * - **Deterministic.** Violations are sorted by file, then position, then rule
 *   id, then violation id, so re-scanning unchanged sources produces
 *   byte-identical output and a CI diff shows only what really changed.
 * - **Honest about failures.** Files that could not be analysed travel in the
 *   payload, so `violations: []` alone never reads as a clean scan.
 */
export function formatJsonReport(report: ScanReport): string {
  return `${JSON.stringify(toPayload(report), undefined, INDENT)}\n`;
}

function toPayload(report: ScanReport): ScanReportPayload {
  const violations = [...report.violations].sort(compareViolations).map(toViolationPayload);
  return {
    contractVersion: SCAN_REPORT_CONTRACT_VERSION,
    tool: { name: "argus", version: CLI_VERSION },
    summary: {
      filesScanned: report.filesScanned,
      violations: violations.length,
      failures: report.failures.length,
      bySeverity: countBySeverity(report.violations),
    },
    violations,
    failures: report.failures.map((failure) => ({
      file: failure.file,
      message: failure.message,
    })),
  };
}

/**
 * The file moves out of the position and onto the violation: a consumer keys by
 * file and then looks at ranges, and repeating the path inside every position
 * is noise on the wire.
 */
function toViolationPayload(violation: Violation): ViolationPayload {
  return {
    id: violation.id,
    ruleId: violation.ruleId,
    severity: violation.severity,
    message: violation.message,
    file: violation.position.file,
    position: {
      startLine: violation.position.startLine,
      startColumn: violation.position.startColumn,
      endLine: violation.position.endLine,
      endColumn: violation.position.endColumn,
    },
    // exactOptionalPropertyTypes: an unclassified file omits the key rather
    // than carrying `"layer": undefined`, which is not valid JSON anyway.
    ...(violation.layer !== undefined ? { layer: violation.layer } : {}),
  };
}

/**
 * Total order over violations: file, start line, start column, rule id, then
 * violation id. The id is what makes it *total* — one rule can report twice at
 * one position (the engine separates those by an ordinal), so the earlier keys
 * leave ties. Code-unit comparison rather than locale collation: the same scan
 * must serialise identically on every machine.
 */
function compareViolations(a: Violation, b: Violation): number {
  return (
    compareStrings(a.position.file, b.position.file) ||
    a.position.startLine - b.position.startLine ||
    a.position.startColumn - b.position.startColumn ||
    compareStrings(a.ruleId, b.ruleId) ||
    compareStrings(a.id, b.id)
  );
}

function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Every severity is present, zeros included, so consumers need no defaulting.
 *
 * The counter is keyed by the contract's vocabulary, so a severity added to the
 * domain without being added to the contract fails to compile here — the one
 * place where the two vocabularies must agree.
 */
function countBySeverity(violations: readonly Violation[]): SeverityCountsPayload {
  const counts: SeverityCountsPayload = { info: 0, warning: 0, error: 0, critical: 0 };
  for (const violation of violations) {
    counts[violation.severity] += 1;
  }
  return counts;
}
