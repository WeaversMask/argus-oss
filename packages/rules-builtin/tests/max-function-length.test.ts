import { describe, expect, it } from "vitest";
import { maxFunctionLength } from "../src/quality/max-function-length.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(maxFunctionLength, "quality/max-function-length", { max: 3 });

const body = (n: number): string =>
  `function f() {\n${Array.from({ length: n }, (_, i) => `  const a${i} = ${i};`).join("\n")}\n}`;

describe("max-function-length specifics", () => {
  it("defaults to a 50-line budget", async () => {
    expect(await runRule(maxFunctionLength, body(48))).toEqual([]); // 48 body + signature + brace = 50
    expect(await runRule(maxFunctionLength, body(49))).toHaveLength(1);
  });

  it("measures nested functions independently", async () => {
    const source = `function outer() {\n  const inner = () => {\n    return 1;\n  };\n  return inner;\n}`;
    // outer spans 6 lines (> 3), inner spans 3 (<= 3): exactly one violation.
    expect(await runRule(maxFunctionLength, source, { options: { max: 3 } })).toHaveLength(1);
  });

  it("reports the measured span", async () => {
    const violations = await runRule(maxFunctionLength, body(5), { options: { max: 3 } });
    expect(violations[0]?.message).toMatch(/spans 7 lines/);
  });
});
