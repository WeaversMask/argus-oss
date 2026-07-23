import { describe, expect, it } from "vitest";
import { cyclomaticComplexity } from "../src/quality/cyclomatic-complexity.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(cyclomaticComplexity, "quality/cyclomatic-complexity", { max: 3 });

describe("cyclomatic-complexity specifics", () => {
  it("scores a straight-line function as 1", async () => {
    expect(
      await runRule(cyclomaticComplexity, `function f() { return 1; }`, { options: { max: 1 } }),
    ).toEqual([]);
  });

  it("counts each logical operator as a branch", async () => {
    // 1 + (&&, ||, &&) = 4 > 3
    const violations = await runRule(
      cyclomaticComplexity,
      `function f(a: boolean, b: boolean, c: boolean, d: boolean) { return a && b || c && d; }`,
      {
        options: { max: 3 },
      },
    );
    expect(violations[0]?.message).toMatch(/complexity 4/);
  });

  it("counts switch cases but not the default", async () => {
    // 1 + 3 cases = 4 > 3; default adds nothing.
    const source = `function f(a: number) { switch (a) { case 1: return 1; case 2: return 2; case 3: return 3; default: return 0; } }`;
    expect(await runRule(cyclomaticComplexity, source, { options: { max: 3 } })).toHaveLength(1);
  });

  it("does not count decisions inside a nested function", async () => {
    // outer has 1 decision (the if); inner's two ifs belong to inner.
    const source = `function outer(a: boolean) {
      const inner = (b: boolean) => {
        if (b) return 1;
        if (b) return 2;
        return 3;
      };
      if (a) return inner(a);
      return 0;
    }`;
    // outer complexity = 1 + 1 = 2; inner = 1 + 2 = 3. Neither exceeds max 3.
    expect(await runRule(cyclomaticComplexity, source, { options: { max: 3 } })).toEqual([]);
  });

  it("defaults to a budget of 10", async () => {
    const ifs = (n: number): string =>
      `function f(a: number) {\n${Array.from({ length: n }, (_, i) => `  if (a === ${i}) return ${i};`).join("\n")}\n  return -1;\n}`;
    expect(await runRule(cyclomaticComplexity, ifs(9))).toEqual([]); // 1 + 9 = 10
    expect(await runRule(cyclomaticComplexity, ifs(10))).toHaveLength(1); // 1 + 10 = 11
  });
});
