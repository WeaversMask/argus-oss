import type { RuleActivation } from "@argus/core";
import type { ResolvedConfig } from "@argus/config";
import { builtinRules } from "@argus/rules-builtin";

/** The active rule set, plus any configured rule ids that match no built-in rule. */
export interface ActivationResolution {
  /** One activation per built-in rule, in catalogue order. */
  readonly activations: readonly RuleActivation[];
  /** Rule ids named in config that no built-in rule provides — a hard error upstream. */
  readonly unknownRuleIds: readonly string[];
}

/**
 * Maps the built-in rule catalogue plus (optional) config onto the concrete
 * `RuleActivation[]` the engine runs.
 *
 * Default posture is **all built-in rules on at their `defaultSeverity`** — a
 * fresh `argus check` finds things without a config file. Config overrides a
 * rule's severity and options by id, including switching it `"off"` (kept in
 * the list so a consumer can see what was explicitly disabled; the engine
 * skips it). A configured id that matches no built-in rule is surfaced as
 * `unknownRuleIds` rather than silently ignored (no silent suppression).
 */
export function resolveActivations(config: ResolvedConfig | undefined): ActivationResolution {
  const known = new Set<string>(builtinRules.map((module) => module.rule.id));
  const overrides = new Map<string, RuleActivation>();
  const unknownRuleIds: string[] = [];

  for (const activation of config?.rules ?? []) {
    if (known.has(activation.ruleId)) {
      overrides.set(activation.ruleId, activation);
    } else {
      unknownRuleIds.push(activation.ruleId);
    }
  }

  const activations = builtinRules.map<RuleActivation>((module) => {
    const override = overrides.get(module.rule.id);
    if (override !== undefined) {
      return override;
    }
    return Object.freeze({
      ruleId: module.rule.id,
      severity: module.rule.defaultSeverity,
      options: Object.freeze({}),
    });
  });

  return { activations, unknownRuleIds };
}
