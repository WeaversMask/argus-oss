import { describe, expect, it } from "vitest";
import { noDeadCode } from "../src/quality/no-dead-code.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(noDeadCode, "quality/no-dead-code");

describe("no-dead-code specifics", () => {
  it("reports only the first unreachable statement", async () => {
    const source = `function f() {\n  return 1;\n  const a = 2;\n  const b = 3;\n}`;
    const violations = await runRule(noDeadCode, source);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.position.startLine).toBe(3);
  });

  it("does not flag a trailing comment after a return", async () => {
    expect(await runRule(noDeadCode, `function f() {\n  return 1; // fine\n}`)).toEqual([]);
  });

  it("does not condemn code after a return nested in an if", async () => {
    const source = `function f(a: boolean) {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}`;
    expect(await runRule(noDeadCode, source)).toEqual([]);
  });

  it("skips hoisted function declarations after a return", async () => {
    const source = `function f() {\n  return g();\n  function g() { return 1; }\n}`;
    expect(await runRule(noDeadCode, source)).toEqual([]);
  });
});
