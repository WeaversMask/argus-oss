import { describe, expect, it } from "vitest";
import type { Violation } from "@argus/core";
import { formatConsoleReport } from "../../src/formatters/console.js";
import type { ScanFailure, ScanReport } from "../../src/report.js";
import { makeViolation } from "../support.js";
import type { ViolationSpec } from "../support.js";

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, "gu");

const PLAIN = { colour: false } as const;
const COLOURED = { colour: true } as const;

function report(
  violations: readonly Violation[],
  failures: readonly ScanFailure[],
  filesScanned: number,
): ScanReport {
  return { violations, failures, filesScanned };
}

const SPECS: readonly ViolationSpec[] = [
  {
    file: "src/a.ts",
    line: 3,
    column: 1,
    severity: "warning",
    rule: "quality/max-file-length",
    message: "too long",
  },
  {
    file: "src/a.ts",
    line: 10,
    column: 2,
    severity: "error",
    rule: "style/import-order",
    message: "out of order",
  },
  {
    file: "src/b.ts",
    line: 1,
    column: 1,
    severity: "warning",
    rule: "docs/require-jsdoc",
    message: "missing jsdoc",
  },
];

const TWO_FILES: readonly Violation[] = SPECS.map(makeViolation);

describe("formatConsoleReport", () => {
  it("reports a clean scan with a file count", () => {
    expect(formatConsoleReport(report([], [], 3), PLAIN)).toBe(
      "No violations found (scanned 3 files).\n",
    );
  });

  it("uses the singular for a single file", () => {
    expect(formatConsoleReport(report([], [], 1), PLAIN)).toBe(
      "No violations found (scanned 1 file).\n",
    );
  });

  it("lays out findings in aligned columns, grouped by file", () => {
    const text = formatConsoleReport(report(TWO_FILES, [], 2), PLAIN);

    // Locations right-aligned per file, severity padded to the widest present,
    // message given the room, rule id trailing as metadata.
    expect(text).toBe(
      [
        "src/a.ts",
        "   3:1  warning  too long  quality/max-file-length",
        "  10:2  error    out of order  style/import-order",
        "",
        "src/b.ts",
        "  1:1  warning  missing jsdoc  docs/require-jsdoc",
        "",
        "3 problems (1 error, 2 warnings) across 2 files",
        "",
      ].join("\n"),
    );
  });

  it("orders files alphabetically, preserving the order given within a file", () => {
    // Same findings, file groups interleaved differently by the caller.
    const outOfOrder = [...TWO_FILES.slice(2), ...TWO_FILES.slice(0, 2)];
    expect(formatConsoleReport(report(outOfOrder, [], 2), PLAIN)).toBe(
      formatConsoleReport(report(TWO_FILES, [], 2), PLAIN),
    );
  });

  it("summarises most-severe-first and omits severities with no findings", () => {
    const text = formatConsoleReport(report(TWO_FILES, [], 2), PLAIN);
    expect(text).toContain("3 problems (1 error, 2 warnings) across 2 files");
    expect(text).not.toContain("0 info");
  });

  it("notes files that could not be analysed, clean scan or not", () => {
    const clean = formatConsoleReport(
      report([], [{ file: "src/x.ts", message: "boom" }], 1),
      PLAIN,
    );
    expect(clean).toContain("No violations found");
    expect(clean).toContain("1 file could not be analysed (details on stderr).");

    const withViolations = formatConsoleReport(
      report(
        TWO_FILES,
        [
          { file: "src/x.ts", message: "boom" },
          { file: "src/y.ts", message: "boom" },
        ],
        3,
      ),
      PLAIN,
    );
    expect(withViolations).toContain("3 problems (1 error, 2 warnings) across 3 files");
    expect(withViolations).toContain("2 files could not be analysed");
  });

  it("emits no escape sequences at all when colour is off", () => {
    const text = formatConsoleReport(
      report(TWO_FILES, [{ file: "x.ts", message: "boom" }], 2),
      PLAIN,
    );
    expect(text).not.toMatch(ANSI);
  });

  it("colours the path, location, severity and rule id when colour is on", () => {
    const text = formatConsoleReport(report(TWO_FILES, [], 2), COLOURED);

    expect(text).toContain(`${ESC}[1msrc/a.ts${ESC}[0m`); // bold path
    expect(text).toContain(`${ESC}[2m 3:1${ESC}[0m`); // dim location, padding inside the span
    expect(text).toContain(`${ESC}[33mwarning${ESC}[0m`); // yellow warning
    expect(text).toContain(`${ESC}[31merror  ${ESC}[0m`); // red error
    expect(text).toContain(`${ESC}[2mstyle/import-order${ESC}[0m`); // dim rule id
    expect(text).toContain(`${ESC}[31m1 error${ESC}[0m`); // summary counts too
  });

  it("colours the clean and unanalysed-files lines", () => {
    const text = formatConsoleReport(report([], [{ file: "x.ts", message: "boom" }], 1), COLOURED);
    expect(text).toContain(`${ESC}[32mNo violations found (scanned 1 file).${ESC}[0m`);
    expect(text).toContain(`${ESC}[33m1 file could not be analysed`);
  });

  it("renders identical text with and without colour once escapes are stripped", () => {
    const scan = report(TWO_FILES, [{ file: "x.ts", message: "boom" }], 4);
    expect(formatConsoleReport(scan, COLOURED).replace(ANSI, "")).toBe(
      formatConsoleReport(scan, PLAIN),
    );
  });
});
