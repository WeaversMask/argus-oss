import { describe, expect, it } from "vitest";
import {
  SCAN_REPORT_CONTRACT_VERSION,
  positionSchema,
  scanReportSchema,
  severitySchema,
  violationSchema,
} from "../src/index.js";
import type { ScanReportPayload, ViolationPayload } from "../src/index.js";

function aViolation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const violation: ViolationPayload = {
    // Shaped like a real emission — the engine's deterministic id is
    // `<uri-encoded file>#<rule>@<startLine>.<startCol>-<endLine>.<endCol>#<ordinal>`.
    id: "src%2Fa.ts#quality/max-file-length@1.1-1.1#0",
    ruleId: "quality/max-file-length",
    severity: "warning",
    message: "File has 420 lines, maximum is 300",
    file: "src/a.ts",
    position: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
  };
  return { ...violation, ...overrides };
}

function aReport(overrides: Partial<Record<keyof ScanReportPayload, unknown>> = {}): unknown {
  const report: ScanReportPayload = {
    contractVersion: SCAN_REPORT_CONTRACT_VERSION,
    tool: { name: "argus", version: "0.0.0" },
    summary: {
      filesScanned: 3,
      violations: 1,
      failures: 0,
      bySeverity: { info: 0, warning: 1, error: 0, critical: 0 },
    },
    violations: [aViolation() as unknown as ViolationPayload],
    failures: [],
  };
  return { ...report, ...overrides };
}

describe("scanReportSchema", () => {
  it("accepts a representative report unchanged", () => {
    const input = aReport();
    const parsed = scanReportSchema.parse(input);
    expect(parsed).toStrictEqual(input);
  });

  it("accepts a clean scan with no violations and no failures", () => {
    const parsed = scanReportSchema.parse(
      aReport({
        summary: {
          filesScanned: 12,
          violations: 0,
          failures: 0,
          bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
        },
        violations: [],
      }),
    );
    expect(parsed.violations).toEqual([]);
    expect(parsed.summary.bySeverity.warning).toBe(0);
  });

  it("accepts failures alongside violations — a partial scan is still a report", () => {
    const parsed = scanReportSchema.parse(
      aReport({
        summary: {
          filesScanned: 2,
          violations: 1,
          failures: 1,
          bySeverity: { info: 0, warning: 1, error: 0, critical: 0 },
        },
        failures: [{ file: "src/broken.ts", message: "could not read file: EACCES" }],
      }),
    );
    expect(parsed.failures).toHaveLength(1);
  });

  it("rejects an unknown top-level key rather than ignoring it", () => {
    const result = scanReportSchema.safeParse({ ...(aReport() as object), extra: true });
    expect(result.success).toBe(false);
  });

  it("rejects a contract version the schema does not speak", () => {
    const result = scanReportSchema.safeParse(aReport({ contractVersion: 2 }));
    expect(result.success).toBe(false);
  });

  it("rejects a tool name other than argus", () => {
    const result = scanReportSchema.safeParse(
      aReport({ tool: { name: "eslint", version: "9.0.0" } }),
    );
    expect(result.success).toBe(false);
  });

  it("requires every severity count, zeros included", () => {
    const result = scanReportSchema.safeParse(
      aReport({
        summary: {
          filesScanned: 1,
          violations: 0,
          failures: 0,
          bySeverity: { warning: 0, error: 0, critical: 0 },
        },
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("violationSchema", () => {
  it("accepts an optional layer", () => {
    const parsed = violationSchema.parse(aViolation({ layer: "domain" }));
    expect(parsed.layer).toBe("domain");
  });

  it("omits layer entirely when the scan did not classify one", () => {
    const parsed = violationSchema.parse(aViolation());
    expect("layer" in parsed).toBe(false);
  });

  it("rejects an unknown key inside a violation", () => {
    const result = violationSchema.safeParse(aViolation({ column: 7 }));
    expect(result.success).toBe(false);
  });

  it.each(["id", "ruleId", "message", "file"])("rejects a blank %s", (field) => {
    const result = violationSchema.safeParse(aViolation({ [field]: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a severity outside the vocabulary", () => {
    const result = violationSchema.safeParse(aViolation({ severity: "fatal" }));
    expect(result.success).toBe(false);
  });
});

describe("severitySchema", () => {
  it.each(["info", "warning", "error", "critical"])("accepts %s", (severity) => {
    expect(severitySchema.parse(severity)).toBe(severity);
  });

  it("rejects off — a deactivated rule reports nothing, so it never reaches the wire", () => {
    expect(severitySchema.safeParse("off").success).toBe(false);
  });
});

describe("positionSchema", () => {
  it("accepts a zero-width point (start === end)", () => {
    const parsed = positionSchema.parse({
      startLine: 4,
      startColumn: 9,
      endLine: 4,
      endColumn: 9,
    });
    expect(parsed.endColumn).toBe(9);
  });

  it("accepts a multi-line range whose end column precedes its start column", () => {
    const result = positionSchema.safeParse({
      startLine: 4,
      startColumn: 40,
      endLine: 9,
      endColumn: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end that precedes its start on the same line", () => {
    const result = positionSchema.safeParse({
      startLine: 4,
      startColumn: 12,
      endLine: 4,
      endColumn: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an end line above the start line", () => {
    const result = positionSchema.safeParse({
      startLine: 9,
      startColumn: 1,
      endLine: 4,
      endColumn: 1,
    });
    expect(result.success).toBe(false);
  });

  it.each(["startLine", "startColumn", "endLine", "endColumn"])(
    "rejects a 0-based %s — coordinates are 1-based",
    (field) => {
      const result = positionSchema.safeParse({
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
        [field]: 0,
      });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a fractional line number", () => {
    const result = positionSchema.safeParse({
      startLine: 1.5,
      startColumn: 1,
      endLine: 2,
      endColumn: 1,
    });
    expect(result.success).toBe(false);
  });
});
