import { describe, expect, it } from "vitest";
import { filePath, position, ruleId, violation, violationId } from "@argus/core";
import type { Severity, Violation } from "@argus/core";
import { formatReport } from "../src/format.js";

function makeViolation(
  file: string,
  line: number,
  column: number,
  severity: Severity,
  rule: string,
  message: string,
): Violation {
  const fp = filePath(file)._unsafeUnwrap();
  const pos = position({
    file: fp,
    startLine: line,
    startColumn: column,
    endLine: line,
    endColumn: column + 1,
  })._unsafeUnwrap();
  const id = violationId(`${file}:${line}:${column}:${rule}`)._unsafeUnwrap();
  return violation({
    id,
    ruleId: ruleId(rule)._unsafeUnwrap(),
    severity,
    message,
    position: pos,
  })._unsafeUnwrap();
}

describe("formatReport", () => {
  it("reports a clean scan with a file count", () => {
    const text = formatReport({ violations: [], failures: [], filesScanned: 3 });
    expect(text).toBe("No violations found (scanned 3 files).\n");
  });

  it("uses the singular for a single file", () => {
    const text = formatReport({ violations: [], failures: [], filesScanned: 1 });
    expect(text).toBe("No violations found (scanned 1 file).\n");
  });

  it("groups violations by file and summarises non-zero severities", () => {
    const violations = [
      makeViolation("src/a.ts", 3, 1, "warning", "quality/max-file-length", "too long"),
      makeViolation("src/a.ts", 10, 2, "error", "style/import-order", "out of order"),
      makeViolation("src/b.ts", 1, 1, "warning", "docs/require-jsdoc", "missing jsdoc"),
    ];

    const text = formatReport({ violations, failures: [], filesScanned: 2 });

    expect(text).toContain("src/a.ts");
    expect(text).toContain("  3:1  warning");
    expect(text).toContain("quality/max-file-length  too long");
    expect(text).toContain("src/b.ts");
    // Most-severe-first, zero severities omitted, nouns pluralised.
    expect(text).toContain("3 problems (1 error, 2 warnings) across 2 files");
    expect(text).not.toContain("0 info");
  });

  it("notes files that could not be analysed", () => {
    const clean = formatReport({
      violations: [],
      failures: [{ file: "src/x.ts", message: "boom" }],
      filesScanned: 1,
    });
    expect(clean).toContain("No violations found");
    expect(clean).toContain("1 file could not be analysed");

    const withViolations = formatReport({
      violations: [makeViolation("src/a.ts", 1, 1, "warning", "docs/require-jsdoc", "m")],
      failures: [
        { file: "src/x.ts", message: "boom" },
        { file: "src/y.ts", message: "boom" },
      ],
      filesScanned: 3,
    });
    expect(withViolations).toContain("1 problem (1 warning) across 3 files");
    expect(withViolations).toContain("2 files could not be analysed");
  });
});
