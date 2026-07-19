import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@argus/core";
import { toResolvedConfig } from "../src/resolved.js";

describe("toResolvedConfig", () => {
  it("applies defaults: every language, nothing ignored, no rules", () => {
    const resolved = toResolvedConfig({})._unsafeUnwrap();

    expect(resolved.languages).toEqual([...LANGUAGES]);
    expect(resolved.ignore).toEqual([]);
    expect(resolved.rules).toEqual([]);
  });

  it("converts rule settings to core RuleActivations, sorted by rule id", () => {
    const resolved = toResolvedConfig({
      rules: {
        "z/rule": "error",
        "a/rule": { severity: "warning", options: { max: 3 } },
        "m/rule": "off",
      },
    })._unsafeUnwrap();

    expect(resolved.rules.map((activation) => activation.ruleId)).toEqual([
      "a/rule",
      "m/rule",
      "z/rule",
    ]);
    expect(resolved.rules[0]!.severity).toBe("warning");
    expect(resolved.rules[0]!.options).toEqual({ max: 3 });
    expect(resolved.rules[1]!.severity).toBe("off"); // preserved, engine skips it
    expect(resolved.rules[2]!.options).toEqual({}); // shorthand gets empty options
  });

  it("freezes the whole shape", () => {
    const resolved = toResolvedConfig({
      languages: ["python"],
      ignore: ["x/**"],
      rules: { "a/rule": { severity: "info", options: { deep: true } } },
    })._unsafeUnwrap();

    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.languages)).toBe(true);
    expect(Object.isFrozen(resolved.ignore)).toBe(true);
    expect(Object.isFrozen(resolved.rules)).toBe(true);
    expect(Object.isFrozen(resolved.rules[0])).toBe(true);
    expect(Object.isFrozen(resolved.rules[0]!.options)).toBe(true);
  });
});
