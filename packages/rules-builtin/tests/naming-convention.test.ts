import { describe, expect, it } from "vitest";
import { namingConvention } from "../src/style/naming-convention.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(namingConvention, "style/naming-convention");

describe("naming-convention specifics", () => {
  it("allows UPPER_SNAKE_CASE constants but flags snake_case", async () => {
    expect(await runRule(namingConvention, `const MAX_SIZE = 1;`)).toEqual([]);
    const violations = await runRule(namingConvention, `const max_size = 1;`);
    expect(violations[0]?.message).toMatch(/camelCase or UPPER_CASE/);
  });

  it("requires PascalCase for types", async () => {
    const violations = await runRule(namingConvention, `class widget {}`);
    expect(violations[0]?.message).toMatch(/PascalCase/);
  });

  it("does not flag destructuring patterns", async () => {
    expect(await runRule(namingConvention, `const { some_key } = obj;`)).toEqual([]);
  });

  it("does not flag function parameters", async () => {
    expect(
      await runRule(namingConvention, `function f(some_param: number) { return some_param; }`),
    ).toEqual([]);
  });

  it("does not crash on anonymous default exports", async () => {
    expect(await runRule(namingConvention, `export default function () {}`)).toEqual([]);
    expect(await runRule(namingConvention, `export default class {}`)).toEqual([]);
  });

  it("allows PascalCase for functions and function-valued consts (components/factories)", async () => {
    expect(await runRule(namingConvention, `export const Button = () => null;`)).toEqual([]);
    expect(await runRule(namingConvention, `export function Widget() { return null; }`)).toEqual(
      [],
    );
    expect(await runRule(namingConvention, `const doThing = function () {};`)).toEqual([]);
  });

  it("still flags snake_case functions and function-valued consts", async () => {
    expect((await runRule(namingConvention, `function do_thing() {}`))[0]?.message).toMatch(
      /Function .* camelCase or PascalCase/,
    );
    expect((await runRule(namingConvention, `const do_thing = () => {};`))[0]?.message).toMatch(
      /Function .* camelCase or PascalCase/,
    );
  });
});
