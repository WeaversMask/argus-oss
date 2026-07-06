import { describe, expect, it } from "vitest";
import { rule, ruleId, ruleProfile, type Rule } from "../../src/domain/rule.js";

const id = ruleId("architecture/no-god-objects")._unsafeUnwrap();

const baseRule: Rule = {
  id,
  name: "No god objects",
  description: "No module may exceed 300 lines without justification.",
  defaultSeverity: "error",
};

describe("ruleId", () => {
  it.each(["no-god-objects", "architecture/no-god-objects", "a/b/c", "x2"])(
    "accepts %s",
    (value) => {
      expect(ruleId(value)._unsafeUnwrap()).toBe(value);
    },
  );

  it.each(["", "NoGodObjects", "-leading", "trailing-", "a//b", "a_b", "2x", "/rooted"])(
    "rejects %s",
    (value) => {
      expect(ruleId(value)._unsafeUnwrapErr().message).toContain("RuleId");
    },
  );
});

describe("rule", () => {
  it("accepts a rule without docsUrl and leaves the key absent", () => {
    const result = rule(baseRule)._unsafeUnwrap();
    expect(result).toEqual(baseRule);
    expect("docsUrl" in result).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts a rule with docsUrl", () => {
    const withDocs = rule({ ...baseRule, docsUrl: "https://argus.dev/rules/no-god-objects" });
    expect(withDocs._unsafeUnwrap().docsUrl).toBe("https://argus.dev/rules/no-god-objects");
  });

  it.each([
    ["name", { ...baseRule, name: "  " }],
    ["description", { ...baseRule, description: "" }],
    ["docsUrl", { ...baseRule, docsUrl: " " }],
  ])("rejects blank %s", (field, input) => {
    expect(
      rule(input)
        ._unsafeUnwrapErr()
        .issues.map((issue) => issue.path),
    ).toEqual([field]);
  });
});

describe("ruleProfile", () => {
  const otherId = ruleId("no-deep-nesting")._unsafeUnwrap();

  it("builds a deep-frozen profile and defaults options to an empty object", () => {
    const profile = ruleProfile({
      name: "recommended",
      description: "Sensible defaults.",
      activations: [
        { ruleId: id, severity: "error", options: { maxLines: 300 } },
        { ruleId: otherId, severity: "off" },
      ],
    })._unsafeUnwrap();
    expect(profile.activations).toHaveLength(2);
    expect(profile.activations[0]?.options).toEqual({ maxLines: 300 });
    expect(profile.activations[1]?.options).toEqual({});
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.activations)).toBe(true);
    expect(Object.isFrozen(profile.activations[0])).toBe(true);
    expect(Object.isFrozen(profile.activations[0]?.options)).toBe(true);
  });

  it("copies options so later mutation of the input cannot leak in", () => {
    const options: Record<string, unknown> = { maxLines: 300 };
    const profile = ruleProfile({
      name: "recommended",
      description: "Sensible defaults.",
      activations: [{ ruleId: id, severity: "warning", options }],
    })._unsafeUnwrap();
    options["maxLines"] = 999;
    expect(profile.activations[0]?.options).toEqual({ maxLines: 300 });
  });

  it("rejects duplicate rule activations", () => {
    const error = ruleProfile({
      name: "recommended",
      description: "Sensible defaults.",
      activations: [
        { ruleId: id, severity: "error" },
        { ruleId: id, severity: "off" },
      ],
    })._unsafeUnwrapErr();
    expect(error.issues).toEqual([
      { path: "activations[1].ruleId", message: `duplicate rule "${id}"` },
    ]);
  });

  it.each([
    ["name", { name: "", description: "d" }],
    ["description", { name: "n", description: " " }],
  ])("rejects blank %s", (field, partial) => {
    const error = ruleProfile({ ...partial, activations: [] })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual([field]);
  });
});
