import { describe, expect, it } from "vitest";
import { maxNestingDepth } from "../src/quality/max-nesting-depth.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(maxNestingDepth, "quality/max-nesting-depth", { max: 2 });

describe("max-nesting-depth specifics", () => {
  it("defaults to a 4-level budget", async () => {
    const four = `function f(a: boolean) { if (a) { if (a) { if (a) { if (a) {} } } } }`;
    const five = `function f(a: boolean) { if (a) { if (a) { if (a) { if (a) { if (a) {} } } } } }`;
    expect(await runRule(maxNestingDepth, four)).toEqual([]);
    expect(await runRule(maxNestingDepth, five)).not.toEqual([]);
  });

  it("does not inflate an else-if ladder", async () => {
    const ladder = `function f(n: number) {
      if (n > 3) {} else if (n > 2) {} else if (n > 1) {} else if (n > 0) {} else {}
    }`;
    expect(await runRule(maxNestingDepth, ladder, { options: { max: 1 } })).toEqual([]);
  });

  it("resets depth inside a nested function", async () => {
    const source = `function outer(a: boolean) {
      if (a) {
        const inner = () => {
          if (a) { if (a) {} }
        };
        return inner;
      }
    }`;
    // outer reaches depth 1; inner independently reaches depth 2 — both within max 2.
    expect(await runRule(maxNestingDepth, source, { options: { max: 2 } })).toEqual([]);
  });

  it("counts brace-less nested bodies the same as braced ones", async () => {
    const braced = `function f(a: boolean, b: number[]) { if (a) { for (const x of b) { if (x>0) { if (x>1) { return x; } } } } }`;
    const braceless = `function f(a: boolean, b: number[]) { if (a) for (const x of b) { if (x>0) { if (x>1) { return x; } } } }`;
    const bracedViols = await runRule(maxNestingDepth, braced, { options: { max: 3 } });
    const bracelessViols = await runRule(maxNestingDepth, braceless, { options: { max: 3 } });
    expect(bracelessViols.length).toBe(bracedViols.length);
    expect(bracelessViols.length).toBeGreaterThan(0);
  });

  it("reports the exceeded depth in the message", async () => {
    const source = `function f(a: boolean) { if (a) { if (a) { if (a) {} } } }`;
    const violations = await runRule(maxNestingDepth, source, { options: { max: 2 } });
    expect(violations[0]?.message).toMatch(/depth 3/);
  });
});
