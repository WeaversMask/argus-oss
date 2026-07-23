import { describe, expect, it } from "vitest";
import { maxFileLength } from "../src/quality/max-file-length.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule, runRuleResult } from "./harness.js";

fixtureSuite(maxFileLength, "quality/max-file-length", { max: 5 });

const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `const a${i} = ${i};`).join("\n");

describe("max-file-length specifics", () => {
  it("defaults to a 300-line budget", async () => {
    expect(await runRule(maxFileLength, lines(300))).toEqual([]);
    expect(await runRule(maxFileLength, lines(301))).toHaveLength(1);
  });

  it("does not count a single trailing newline as a line", async () => {
    expect(await runRule(maxFileLength, `${lines(5)}\n`, { options: { max: 5 } })).toEqual([]);
  });

  it("reports the offending line count and points past the limit", async () => {
    const violations = await runRule(maxFileLength, lines(7), { options: { max: 5 } });
    expect(violations[0]?.message).toContain("7 lines");
    expect(violations[0]?.position.startLine).toBe(6);
  });

  it("fails the rule on a non-positive max option", async () => {
    const result = await runRuleResult(maxFileLength, lines(3), { options: { max: 0 } });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toMatch(/positive integer/);
  });
});
