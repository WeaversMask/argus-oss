import { SEVERITIES } from "@argus/core";
import type { Severity, Violation } from "@argus/core";
import type { ScanReport } from "../report.js";
import { stylesFor } from "./colour.js";
import type { Styles } from "./colour.js";

/** How to render this run. */
export interface ConsoleFormatOptions {
  /** Emit ANSI escapes. Decided by `shouldUseColour`, never guessed here. */
  readonly colour: boolean;
}

/** Severities most-severe first, for stable summary ordering. */
const DISPLAY_ORDER: readonly Severity[] = Object.freeze([...SEVERITIES].reverse());

/** Violations of one file, in source order, under the path they belong to. */
interface FileGroup {
  readonly file: string;
  readonly violations: readonly Violation[];
}

/**
 * Renders the human-readable report: violations grouped by file, then a
 * summary. Each finding is one line —
 * `line:col  severity  message  rule-id` — with the message given the space,
 * and coordinates and rule id dimmed as the metadata they are.
 *
 * Colour is decorative only: severity is always spelled out in words, so the
 * report loses no information with `NO_COLOR`, in a pipe, or on a monochrome
 * terminal. Column widths are computed from the visible text before styling,
 * so escapes never distort alignment.
 */
export function formatConsoleReport(report: ScanReport, options: ConsoleFormatOptions): string {
  const styles = stylesFor(options.colour);
  const lines: string[] = [];

  const severityWidth = widestSeverity(report.violations);
  for (const group of groupByFile(report.violations)) {
    lines.push(styles.path(group.file));
    const locationWidth = widestLocation(group.violations);
    for (const violation of group.violations) {
      lines.push(findingLine(violation, { locationWidth, severityWidth }, styles));
    }
    lines.push("");
  }

  lines.push(...summaryLines(report, styles));
  return `${lines.join("\n")}\n`;
}

/** Column widths shared by every finding line of one file. */
interface Columns {
  readonly locationWidth: number;
  readonly severityWidth: number;
}

function findingLine(violation: Violation, columns: Columns, styles: Styles): string {
  const location = locationOf(violation).padStart(columns.locationWidth);
  const severity = violation.severity.padEnd(columns.severityWidth);
  return [
    "  ",
    styles.location(location),
    "  ",
    styles.severity(violation.severity)(severity),
    "  ",
    violation.message,
    "  ",
    styles.ruleId(violation.ruleId),
  ].join("");
}

function locationOf(violation: Violation): string {
  return `${violation.position.startLine}:${violation.position.startColumn}`;
}

/** Groups violations by file, files alphabetical, source order preserved within. */
function groupByFile(violations: readonly Violation[]): readonly FileGroup[] {
  const byFile = new Map<string, Violation[]>();
  for (const violation of violations) {
    const file: string = violation.position.file;
    const existing = byFile.get(file);
    if (existing === undefined) {
      byFile.set(file, [violation]);
    } else {
      existing.push(violation);
    }
  }

  // Code-unit order, not locale collation: the same scan must print the same
  // way on every machine. Map keys are unique, so a tie is impossible.
  return [...byFile.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([file, grouped]) => ({ file, violations: grouped }));
}

function widestLocation(violations: readonly Violation[]): number {
  return Math.max(...violations.map((violation) => locationOf(violation).length));
}

/** Width of the severity column: only severities this report actually contains. */
function widestSeverity(violations: readonly Violation[]): number {
  return violations.reduce((widest, violation) => Math.max(widest, violation.severity.length), 0);
}

/** The summary: one counts line, plus the unanalysed-files note when there is one. */
function summaryLines(report: ScanReport, styles: Styles): readonly string[] {
  const files = `${report.filesScanned} ${plural(report.filesScanned, "file")}`;
  const total = report.violations.length;

  const summary =
    total === 0
      ? styles.clean(`No violations found (scanned ${files}).`)
      : `${total} ${plural(total, "problem")} (${severityCounts(report.violations, styles)}) across ${files}`;

  if (report.failures.length === 0) {
    return [summary];
  }
  return [summary, styles.failure(failureNote(report.failures.length))];
}

/** `1 error, 2 warnings` — most severe first, severities with no findings omitted. */
function severityCounts(violations: readonly Violation[], styles: Styles): string {
  return DISPLAY_ORDER.map((severity) => ({
    severity,
    count: violations.filter((violation) => violation.severity === severity).length,
  }))
    .filter((entry) => entry.count > 0)
    .map((entry) =>
      styles.severity(entry.severity)(`${entry.count} ${plural(entry.count, entry.severity)}`),
    )
    .join(", ");
}

function failureNote(count: number): string {
  return `${count} ${plural(count, "file")} could not be analysed (details on stderr).`;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
