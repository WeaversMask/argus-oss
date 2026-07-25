import { describe, expect, it } from "vitest";
import { builtinRules } from "@argus/rules-builtin";
import { runExplain } from "../src/explain.js";
import { captureIO } from "./support.js";

describe("runExplain", () => {
  it("describes a known rule", () => {
    const io = captureIO(process.cwd());
    const code = runExplain("quality/max-file-length", io);

    expect(code).toBe(0);
    const out = io.out();
    expect(out).toContain("quality/max-file-length");
    expect(out).toContain("name:");
    expect(out).toContain("severity: warning (default)");
    // The full description is printed.
    const rule = builtinRules.find((m) => m.rule.id === "quality/max-file-length")?.rule;
    expect(out).toContain(rule?.description ?? "MISSING");
    expect(io.err()).toBe("");
  });

  it("errors on an unknown rule and lists the known ids", () => {
    const io = captureIO(process.cwd());
    const code = runExplain("nope/not-real", io);

    expect(code).toBe(2);
    expect(io.err()).toContain('unknown rule "nope/not-real"');
    expect(io.err()).toContain("Known rules:");
    expect(io.err()).toContain("quality/cyclomatic-complexity");
    expect(io.out()).toBe("");
  });
});
