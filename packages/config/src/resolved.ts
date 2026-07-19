import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { LANGUAGES, ruleId } from "@argus/core";
import type { Language, RuleActivation } from "@argus/core";
import { ConfigError } from "./errors.js";
import type { RawConfig } from "./schema.js";

/**
 * The final, merged, defaulted configuration — what the rest of the system
 * consumes. Frozen throughout; `rules` uses core's `RuleActivation` (with
 * `"off"` entries preserved — the rule engine skips them, and keeping them
 * lets a consumer see what was explicitly disabled), sorted by rule id for
 * determinism.
 */
export interface ResolvedConfig {
  readonly languages: readonly Language[];
  readonly ignore: readonly string[];
  readonly rules: readonly RuleActivation[];
}

/** Applies defaults and converts the merged raw shape into frozen core-typed values. */
export function toResolvedConfig(raw: RawConfig): Result<ResolvedConfig, ConfigError> {
  const rules: RuleActivation[] = [];
  for (const [id, setting] of Object.entries(raw.rules ?? {}).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const parsedId = ruleId(id);
    if (parsedId.isErr()) {
      // Defensive, uncovered: the schema already ran every key through
      // core's ruleId factory — kept so schema/factory drift fails loudly.
      return err(
        new ConfigError("Invalid configuration", [
          { file: "<merged>", path: `rules.${id}`, message: "invalid rule id after validation" },
        ]),
      );
    }
    const severity = typeof setting === "string" ? setting : setting.severity;
    const options = typeof setting === "string" ? {} : (setting.options ?? {});
    rules.push(
      Object.freeze({ ruleId: parsedId.value, severity, options: Object.freeze({ ...options }) }),
    );
  }
  return ok(
    Object.freeze({
      languages: Object.freeze([...(raw.languages ?? LANGUAGES)]),
      ignore: Object.freeze([...(raw.ignore ?? [])]),
      rules: Object.freeze(rules),
    }),
  );
}
