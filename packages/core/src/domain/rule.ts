import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { Brand } from "./brand.js";
import type { Severity } from "./severity.js";
import { Validator } from "./validation.js";

export type RuleId = Brand<string, "RuleId">;

/** Kebab-case with optional `/`-separated category segments, e.g. `"architecture/no-god-objects"`. */
const RULE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*$/;

/** Validates and brands a raw string as a {@link RuleId}. */
export function ruleId(value: string): Result<RuleId, ValidationError> {
  const validator = new Validator("RuleId");
  validator.matches(
    "value",
    value,
    RULE_ID,
    "must be kebab-case with optional '/'-separated category segments",
  );
  return validator.toResult(() => value as RuleId);
}

/** The static definition of a check — what it looks for, not how it runs. */
export interface Rule {
  readonly id: RuleId;
  readonly name: string;
  readonly description: string;
  readonly defaultSeverity: Severity;
  readonly docsUrl?: string;
}

/** Smart constructor: validates a {@link Rule} and returns a frozen copy. */
export function rule(input: Rule): Result<Rule, ValidationError> {
  const validator = new Validator("Rule");
  validator.nonBlankString("name", input.name);
  validator.nonBlankString("description", input.description);
  if (input.docsUrl !== undefined) {
    validator.nonBlankString("docsUrl", input.docsUrl);
  }
  return validator.toResult(() =>
    Object.freeze({
      id: input.id,
      name: input.name,
      description: input.description,
      defaultSeverity: input.defaultSeverity,
      ...(input.docsUrl !== undefined ? { docsUrl: input.docsUrl } : {}),
    }),
  );
}

/** One rule switched on at a severity (or off), with rule-specific options. */
export interface RuleActivation {
  readonly ruleId: RuleId;
  readonly severity: Severity | "off";
  /** Rule-specific configuration, opaque to the domain. */
  readonly options: Readonly<Record<string, unknown>>;
}

/** One unvalidated activation within a {@link RuleProfileInput} — `options` optional before defaulting to `{}`. */
export interface RuleActivationInput {
  readonly ruleId: RuleId;
  readonly severity: Severity | "off";
  readonly options?: Readonly<Record<string, unknown>>;
}

/** A named, shareable set of rule activations (like an ESLint preset). */
export interface RuleProfile {
  readonly name: string;
  readonly description: string;
  readonly activations: readonly RuleActivation[];
}

/** Unvalidated input to {@link ruleProfile} — activations as {@link RuleActivationInput}. */
export interface RuleProfileInput {
  readonly name: string;
  readonly description: string;
  readonly activations: readonly RuleActivationInput[];
}

/** Smart constructor: validates a {@link RuleProfileInput} — no duplicate rule ids — and returns a frozen {@link RuleProfile}. */
export function ruleProfile(input: RuleProfileInput): Result<RuleProfile, ValidationError> {
  const validator = new Validator("RuleProfile");
  validator.nonBlankString("name", input.name);
  validator.nonBlankString("description", input.description);
  const seen = new Set<string>();
  input.activations.forEach((activation, i) => {
    if (seen.has(activation.ruleId)) {
      validator.add(`activations[${i}].ruleId`, `duplicate rule "${activation.ruleId}"`);
    }
    seen.add(activation.ruleId);
  });
  return validator.toResult(() =>
    Object.freeze({
      name: input.name,
      description: input.description,
      activations: Object.freeze(
        input.activations.map((activation) =>
          Object.freeze({
            ruleId: activation.ruleId,
            severity: activation.severity,
            options: Object.freeze({ ...activation.options }),
          }),
        ),
      ),
    }),
  );
}
