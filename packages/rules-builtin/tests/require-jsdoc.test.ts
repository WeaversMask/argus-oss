import { describe, expect, it } from "vitest";
import { requireJsdoc } from "../src/docs/require-jsdoc.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(requireJsdoc, "docs/require-jsdoc");

describe("require-jsdoc specifics", () => {
  it("accepts a JSDoc block immediately preceding the export", async () => {
    expect(await runRule(requireJsdoc, `/** doc */\nexport function f() {}`)).toEqual([]);
  });

  it("rejects a line comment as documentation", async () => {
    const violations = await runRule(requireJsdoc, `// not jsdoc\nexport function f() {}`);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toMatch(/Exported function/);
  });

  it("does not require docs on non-exported declarations", async () => {
    expect(await runRule(requireJsdoc, `function f() {}\nclass C {}`)).toEqual([]);
  });

  it("does not require docs on exported const or type aliases", async () => {
    expect(await runRule(requireJsdoc, `export const x = 1;\nexport type T = string;`)).toEqual([]);
  });

  it("treats a documented overload set as documented (doc above the signatures)", async () => {
    const documented = `/** Parses. */\nexport function p(a: string): string;\nexport function p(a: number): number;\nexport function p(a: unknown): unknown { return a; }`;
    expect(await runRule(requireJsdoc, documented)).toEqual([]);
  });

  it("flags an undocumented overload set once, on the implementation", async () => {
    const undocumented = `export function p(a: string): string;\nexport function p(a: number): number;\nexport function p(a: unknown): unknown { return a; }`;
    expect(await runRule(requireJsdoc, undocumented)).toHaveLength(1);
  });
});
