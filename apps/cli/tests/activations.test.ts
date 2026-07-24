import { describe, expect, it } from "vitest";
import { ruleId } from "@argus/core";
import type { ResolvedConfig } from "@argus/config";
import { builtinRules } from "@argus/rules-builtin";
import { resolveActivations } from "../src/activations.js";

const rid = (value: string) => ruleId(value)._unsafeUnwrap();

function config(rules: ResolvedConfig["rules"]): ResolvedConfig {
  return { languages: ["typescript"], ignore: [], rules };
}

describe("resolveActivations", () => {
  it("activates every built-in rule at its default when there is no config", () => {
    const { activations, unknownRuleIds } = resolveActivations(undefined);

    expect(unknownRuleIds).toEqual([]);
    expect(activations).toHaveLength(builtinRules.length);
    for (const module of builtinRules) {
      const activation = activations.find((entry) => entry.ruleId === module.rule.id);
      expect(activation?.severity).toBe(module.rule.defaultSeverity);
      expect(activation?.options).toEqual({});
    }
  });

  it("applies config overrides by id, preserving severity, options, and off", () => {
    const cfg = config([
      { ruleId: rid("quality/max-function-length"), severity: "error", options: { max: 40 } },
      { ruleId: rid("style/no-wildcard-imports"), severity: "off", options: {} },
    ]);

    const { activations, unknownRuleIds } = resolveActivations(cfg);

    expect(unknownRuleIds).toEqual([]);
    const overridden = activations.find((a) => a.ruleId === "quality/max-function-length");
    expect(overridden?.severity).toBe("error");
    expect(overridden?.options).toEqual({ max: 40 });

    const disabled = activations.find((a) => a.ruleId === "style/no-wildcard-imports");
    expect(disabled?.severity).toBe("off");

    // A rule not mentioned in config stays at its default.
    const untouched = activations.find((a) => a.ruleId === "quality/no-dead-code");
    expect(untouched?.severity).toBe("warning");
  });

  it("surfaces configured ids that match no built-in rule instead of dropping them", () => {
    const cfg = config([{ ruleId: rid("made-up/rule"), severity: "error", options: {} }]);

    const { activations, unknownRuleIds } = resolveActivations(cfg);

    expect(unknownRuleIds).toEqual(["made-up/rule"]);
    expect(activations.find((a) => a.ruleId === "made-up/rule")).toBeUndefined();
    expect(activations).toHaveLength(builtinRules.length);
  });
});
