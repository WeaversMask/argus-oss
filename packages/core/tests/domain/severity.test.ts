import { describe, expect, it } from "vitest";
import {
  compareSeverity,
  isSeverity,
  SEVERITIES,
  severityAtLeast,
} from "../../src/domain/severity.js";

describe("severity", () => {
  it("isSeverity narrows only the four known severities", () => {
    for (const severity of SEVERITIES) {
      expect(isSeverity(severity)).toBe(true);
    }
    expect(isSeverity("fatal")).toBe(false);
    expect(isSeverity(42)).toBe(false);
  });

  it("compareSeverity orders info < warning < error < critical", () => {
    expect(compareSeverity("info", "critical")).toBeLessThan(0);
    expect(compareSeverity("critical", "warning")).toBeGreaterThan(0);
    expect(compareSeverity("error", "error")).toBe(0);
  });

  it("severityAtLeast is inclusive at the floor", () => {
    expect(severityAtLeast("error", "error")).toBe(true);
    expect(severityAtLeast("critical", "warning")).toBe(true);
    expect(severityAtLeast("info", "warning")).toBe(false);
  });
});
