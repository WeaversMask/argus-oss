import { describe, expect, it } from "vitest";
import { finding, type FindingInput } from "../../src/domain/finding.js";
import { somePosition } from "../fixtures.js";

const base: FindingInput = {
  tool: "jscpd",
  externalRuleId: "duplicate-code",
  message: "12 duplicated lines also found in src/other.ts",
  position: somePosition(),
};

describe("finding", () => {
  it("accepts a finding without severity or metadata, defaulting metadata to {}", () => {
    const result = finding(base)._unsafeUnwrap();
    expect("severity" in result).toBe(false);
    expect(result.metadata).toEqual({});
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.metadata)).toBe(true);
  });

  it("keeps a mapped severity and copies metadata defensively", () => {
    const metadata: Record<string, unknown> = { cloneLines: 12 };
    const result = finding({ ...base, severity: "warning", metadata })._unsafeUnwrap();
    metadata["cloneLines"] = 99;
    expect(result.severity).toBe("warning");
    expect(result.metadata["cloneLines"]).toBe(12);
  });

  it.each([
    ["tool", { ...base, tool: "" }],
    ["externalRuleId", { ...base, externalRuleId: " " }],
    ["message", { ...base, message: "" }],
  ])("rejects blank %s", (field, input) => {
    expect(
      finding(input)
        ._unsafeUnwrapErr()
        .issues.map((issue) => issue.path),
    ).toEqual([field]);
  });
});
