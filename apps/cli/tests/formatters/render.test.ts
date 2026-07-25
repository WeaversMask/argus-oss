import { describe, expect, it } from "vitest";
import { renderReport } from "../../src/formatters/render.js";
import type { OutputFormat, RenderOptions } from "../../src/formatters/render.js";
import type { ScanReport } from "../../src/report.js";
import { makeViolation } from "../support.js";

const REPORT: ScanReport = {
  violations: [
    makeViolation({
      file: "src/a.ts",
      line: 1,
      column: 1,
      severity: "error",
      rule: "docs/require-jsdoc",
      message: "Exported function should have a JSDoc comment.",
    }),
  ],
  failures: [],
  filesScanned: 1,
};

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "u");

function options(overrides: Partial<RenderOptions> = {}): RenderOptions {
  return { format: "console", colour: true, env: {}, isTTY: false, ...overrides };
}

describe("renderReport", () => {
  it("renders the console report for the console format", () => {
    expect(renderReport(REPORT, options())).toContain("docs/require-jsdoc");
  });

  it("lets the environment decide colour on the console path", () => {
    expect(renderReport(REPORT, options({ isTTY: true }))).toMatch(ANSI);
    expect(renderReport(REPORT, options({ isTTY: true, colour: false }))).not.toMatch(ANSI);
  });

  it("renders JSON for the json format, ignoring every colour signal", () => {
    const rendered = renderReport(
      REPORT,
      options({ format: "json", isTTY: true, env: { FORCE_COLOR: "1" } }),
    );
    expect(rendered).not.toMatch(ANSI);
    expect(JSON.parse(rendered)).toHaveProperty("contractVersion");
  });

  it("throws rather than falling back when a format has no branch", () => {
    // Unreachable through the CLI: commander's `.choices()` is derived from the
    // same OUTPUT_FORMATS list. The guard exists so that adding a format
    // without its branch is a compile error; this pins what happens if one
    // reaches here anyway — a loud failure, never the human report piped into
    // a machine's input.
    const unlisted = "sarif" as unknown as OutputFormat;
    expect(() => renderReport(REPORT, options({ format: unlisted }))).toThrow(
      "unhandled output format: sarif",
    );
  });
});
