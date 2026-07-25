import { SEVERITIES } from "@argus/core";
import type { Severity, Violation } from "@argus/core";

/** A file that could not be parsed or whose rule run failed. */
export interface ScanFailure {
  /** Display path of the offending file. */
  readonly file: string;
  readonly message: string;
}

/** Everything the reporter needs to render one scan's outcome. */
export interface ScanReport {
  readonly violations: readonly Violation[];
  readonly failures: readonly ScanFailure[];
  readonly filesScanned: number;
}

/** Severities most-severe first, for stable summary ordering. */
const DISPLAY_ORDER: readonly Severity[] = [...SEVERITIES].reverse();
const SEVERITY_WIDTH = Math.max(...SEVERITIES.map((s) => s.length));

/**
 * Renders the human-readable stdout report: violations grouped by file
 * (source order within a file), then a one-line summary. Deliberately plain
 * (no colour, no symbols) — the colour console formatter and JSON output are
 * separate follow-ups (P2-03/P2-04); this is the baseline P2-02 ships so the
 * exit-code contract is observable.
 */
export function formatReport(report: ScanReport): string {
  const lines: string[] = [];

  const byFile = new Map<string, Violation[]>();
  for (const violation of report.violations) {
    const file: string = violation.position.file;
    const existing = byFile.get(file);
    if (existing === undefined) {
      byFile.set(file, [violation]);
    } else {
      existing.push(violation);
    }
  }

  const files = [...byFile.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [file, violations] of files) {
    lines.push(file);
    for (const violation of violations) {
      const location = `${violation.position.startLine}:${violation.position.startColumn}`;
      const severity = violation.severity.padEnd(SEVERITY_WIDTH);
      lines.push(`  ${location}  ${severity}  ${violation.ruleId}  ${violation.message}`);
    }
    lines.push("");
  }

  lines.push(summaryLine(report));
  return `${lines.join("\n")}\n`;
}

function summaryLine(report: ScanReport): string {
  const total = report.violations.length;
  const files = `${report.filesScanned} ${plural(report.filesScanned, "file")}`;

  if (total === 0) {
    const clean = `No violations found (scanned ${files}).`;
    return report.failures.length > 0 ? `${clean}\n${failureNote(report.failures.length)}` : clean;
  }

  const counts = DISPLAY_ORDER.map((severity) => ({
    severity,
    count: report.violations.filter((violation) => violation.severity === severity).length,
  }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${plural(entry.count, entry.severity)}`)
    .join(", ");

  const summary = `${total} ${plural(total, "problem")} (${counts}) across ${files}`;
  return report.failures.length > 0
    ? `${summary}\n${failureNote(report.failures.length)}`
    : summary;
}

function failureNote(count: number): string {
  return `${count} ${plural(count, "file")} could not be analysed (details on stderr).`;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
