import { scanReportSchema, severitySchema } from "@argus/api-contracts";
import type { ScanReportPayload } from "@argus/api-contracts";
import { SEVERITIES } from "@argus/core";
import { describe, expect, it } from "vitest";
import { formatJsonReport } from "../../src/formatters/json.js";
import type { ScanReport } from "../../src/report.js";
import { CLI_VERSION } from "../../src/version.js";
import { makeViolation } from "../support.js";

/**
 * Parses the emitted document the way a consumer does, then holds it to the
 * published contract. Every assertion below works on a schema-validated
 * payload, so a shape change cannot pass by only satisfying a hand-written
 * expectation.
 */
function emit(report: ScanReport): ScanReportPayload {
  const text = formatJsonReport(report);
  expect(text.endsWith("\n")).toBe(true);
  return scanReportSchema.parse(JSON.parse(text));
}

function reportOf(overrides: Partial<ScanReport> = {}): ScanReport {
  return { violations: [], failures: [], filesScanned: 0, ...overrides };
}

const WARNING = makeViolation({
  file: "src/a.ts",
  line: 12,
  column: 3,
  severity: "warning",
  rule: "docs/require-jsdoc",
  message: "Exported function foo is missing JSDoc",
});

describe("formatJsonReport", () => {
  it("emits a document that validates against the published contract", () => {
    const payload = emit(reportOf({ violations: [WARNING], filesScanned: 4 }));

    expect(payload.contractVersion).toBe(1);
    expect(payload.tool).toEqual({ name: "argus", version: CLI_VERSION });
    expect(payload.summary).toEqual({
      filesScanned: 4,
      violations: 1,
      failures: 0,
      bySeverity: { info: 0, warning: 1, error: 0, critical: 0 },
    });
  });

  it("emits a valid document for a clean scan", () => {
    const payload = emit(reportOf({ filesScanned: 9 }));

    expect(payload.violations).toEqual([]);
    expect(payload.failures).toEqual([]);
    expect(payload.summary.filesScanned).toBe(9);
  });

  it("emits a valid document for a scan of nothing at all", () => {
    // `argus check` on a directory with no source files: a successful scan of
    // zero files still has to hand a consumer a parseable document.
    const payload = emit(reportOf());
    expect(payload.summary).toEqual({
      filesScanned: 0,
      violations: 0,
      failures: 0,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
    });
  });

  it("hoists the file onto the violation and keeps the range intact", () => {
    const payload = emit(
      reportOf({
        violations: [
          makeViolation({
            file: "src/wide.ts",
            line: 4,
            column: 7,
            endLine: 9,
            endColumn: 2,
            severity: "error",
            rule: "quality/max-function-length",
            message: "Function is 120 lines, maximum is 50",
          }),
        ],
      }),
    );

    expect(payload.violations[0]).toEqual({
      // makeViolation derives the id as `<file>:<line>:<column>:<rule>`.
      id: "src/wide.ts:4:7:quality/max-function-length",
      ruleId: "quality/max-function-length",
      severity: "error",
      message: "Function is 120 lines, maximum is 50",
      file: "src/wide.ts",
      position: { startLine: 4, startColumn: 7, endLine: 9, endColumn: 2 },
    });
  });

  it("carries a layer when the file was classified, and omits the key otherwise", () => {
    const classified = emit(
      reportOf({
        violations: [
          makeViolation({
            file: "src/domain/order.ts",
            line: 1,
            column: 1,
            severity: "error",
            rule: "style/no-wildcard-imports",
            message: "Wildcard import",
            layer: "domain",
          }),
        ],
      }),
    );
    expect(classified.violations[0]?.layer).toBe("domain");

    const unclassified = emit(reportOf({ violations: [WARNING] }));
    expect(unclassified.violations[0]).not.toHaveProperty("layer");
  });

  it("counts every severity, zeros included", () => {
    const payload = emit(
      reportOf({
        violations: SEVERITIES.map((severity, index) =>
          makeViolation({
            file: "src/a.ts",
            line: index + 1,
            column: 1,
            severity,
            rule: "docs/require-jsdoc",
            message: `finding ${severity}`,
          }),
        ).filter((violation) => violation.severity !== "info"),
      }),
    );

    expect(payload.summary.bySeverity).toEqual({ info: 0, warning: 1, error: 1, critical: 1 });
    expect(payload.summary.violations).toBe(3);
  });

  it("reports files that could not be analysed", () => {
    const payload = emit(
      reportOf({
        failures: [{ file: "src/broken.ts", message: "could not read file: EACCES" }],
        filesScanned: 2,
      }),
    );

    expect(payload.failures).toEqual([
      { file: "src/broken.ts", message: "could not read file: EACCES" },
    ]);
    expect(payload.summary.failures).toBe(1);
    // The pairing that matters: no violations, yet the scan was not clean.
    expect(payload.summary.violations).toBe(0);
  });

  it("orders violations by file, then position, then rule id", () => {
    const violations = [
      makeViolation({
        file: "src/b.ts",
        line: 1,
        column: 1,
        severity: "error",
        rule: "docs/require-jsdoc",
        message: "b first",
      }),
      makeViolation({
        file: "src/a.ts",
        line: 10,
        column: 5,
        severity: "error",
        rule: "docs/require-jsdoc",
        message: "a tenth line",
      }),
      makeViolation({
        file: "src/a.ts",
        line: 2,
        column: 9,
        severity: "warning",
        rule: "style/import-order",
        message: "a second line, later column",
      }),
      makeViolation({
        file: "src/a.ts",
        line: 2,
        column: 1,
        severity: "warning",
        rule: "style/no-wildcard-imports",
        message: "a second line, first column",
      }),
    ];

    const payload = emit(reportOf({ violations }));
    expect(payload.violations.map((violation) => violation.message)).toEqual([
      "a second line, first column",
      "a second line, later column",
      "a tenth line",
      "b first",
    ]);
  });

  it("breaks a same-rule, same-position tie on the violation id", () => {
    // What the engine produces when one rule reports twice at one position:
    // identical coordinates, ids separated by an ordinal.
    const twice = ["quality/no-dead-code:1", "quality/no-dead-code:0"].map((id) =>
      makeViolation({
        id,
        file: "src/a.ts",
        line: 5,
        column: 1,
        severity: "warning",
        rule: "quality/no-dead-code",
        message: id,
      }),
    );

    const payload = emit(reportOf({ violations: twice }));
    expect(payload.violations.map((violation) => violation.id)).toEqual([
      "quality/no-dead-code:0",
      "quality/no-dead-code:1",
    ]);
  });

  it("is deterministic: input order cannot change the bytes", () => {
    const violations = [
      makeViolation({
        file: "src/a.ts",
        line: 3,
        column: 1,
        severity: "error",
        rule: "quality/no-dead-code",
        message: "one",
      }),
      makeViolation({
        file: "src/a.ts",
        line: 3,
        column: 1,
        severity: "error",
        rule: "docs/require-jsdoc",
        message: "two",
      }),
      makeViolation({
        file: "src/a.ts",
        line: 1,
        column: 1,
        severity: "info",
        rule: "style/naming-convention",
        message: "three",
      }),
    ];

    const forwards = formatJsonReport(reportOf({ violations }));
    const backwards = formatJsonReport(reportOf({ violations: [...violations].reverse() }));
    expect(backwards).toBe(forwards);
  });

  it("escapes message content rather than restricting it", () => {
    // The console formatter assumes one-line messages; JSON has no such limit,
    // so quotes, newlines and backslashes must survive a round trip verbatim.
    const message = 'Value "x\\y" must not span\nlines';
    const payload = emit(
      reportOf({
        violations: [
          makeViolation({
            file: "src/a.ts",
            line: 1,
            column: 1,
            severity: "error",
            rule: "docs/require-jsdoc",
            message,
          }),
        ],
      }),
    );

    expect(payload.violations[0]?.message).toBe(message);
  });

  it("never emits ANSI escapes — the machine format has no colour setting", () => {
    const escapes = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "u");
    expect(formatJsonReport(reportOf({ violations: [WARNING] }))).not.toMatch(escapes);
  });
});

describe("the domain and the wire contract agree", () => {
  // The one place the two severity vocabularies must line up: this formatter
  // maps core's Severity straight onto the contract's enum. @argus/api-contracts
  // deliberately does not import @argus/core (a consumer of the wire format has
  // no domain layer), so the agreement is asserted here, where the mapping is.
  it.each([...SEVERITIES])("accepts the domain severity %s on the wire", (severity) => {
    expect(severitySchema.parse(severity)).toBe(severity);
  });

  it("has no wire severity the domain cannot produce", () => {
    expect([...severitySchema.options].sort()).toEqual([...SEVERITIES].sort());
  });
});
