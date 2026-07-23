import { describe, expect, it } from "vitest";
import { noEmptyTest } from "../src/testing/no-empty-test.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(noEmptyTest, "testing/no-empty-test");

describe("no-empty-test specifics", () => {
  it("flags an empty arrow callback", async () => {
    const violations = await runRule(noEmptyTest, `it("x", () => {});`, { file: "x.test.ts" });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toMatch(/empty body/);
  });

  it("treats a comment-only body as empty", async () => {
    expect(
      await runRule(noEmptyTest, `it("x", () => { /* todo */ });`, { file: "x.test.ts" }),
    ).toHaveLength(1);
  });

  it("does not flag a pending test with no callback", async () => {
    expect(await runRule(noEmptyTest, `it("todo");`, { file: "x.test.ts" })).toEqual([]);
  });

  it("does not flag a body with assertions", async () => {
    expect(
      await runRule(noEmptyTest, `test("x", () => { expect(1).toBe(1); });`, { file: "x.test.ts" }),
    ).toEqual([]);
  });

  it("does not match namespaced forms like it.skip", async () => {
    expect(await runRule(noEmptyTest, `it.skip("x", () => {});`, { file: "x.test.ts" })).toEqual(
      [],
    );
  });

  it("does not flag an expression-bodied arrow callback", async () => {
    expect(
      await runRule(noEmptyTest, `it("x", () => expect(1).toBe(1));`, { file: "x.test.ts" }),
    ).toEqual([]);
  });
});
