import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { SuppressionId } from "./ids.js";
import type { RuleId } from "./rule.js";
import type { Timestamp } from "./timestamp.js";
import { Validator } from "./validation.js";

/**
 * A deliberate, justified decision to ignore a rule for matching files.
 * `reason` is mandatory — silent suppression is forbidden by principle.
 */
export interface Suppression {
  readonly id: SuppressionId;
  readonly ruleId: RuleId;
  /** Glob pattern selecting the files the suppression applies to. */
  readonly pathPattern: string;
  readonly reason: string;
  readonly createdAt: Timestamp;
  /** When set, the suppression stops applying at this instant (inclusive). */
  readonly expiresAt?: Timestamp;
}

/** Smart constructor: validates a {@link Suppression} — non-blank pattern/reason, `expiresAt` after `createdAt` — and returns a frozen copy. */
export function suppression(input: Suppression): Result<Suppression, ValidationError> {
  const validator = new Validator("Suppression");
  validator.nonBlankString("pathPattern", input.pathPattern);
  validator.nonBlankString("reason", input.reason);
  if (input.expiresAt !== undefined && input.expiresAt <= input.createdAt) {
    validator.add("expiresAt", "must be after createdAt");
  }
  return validator.toResult(() =>
    Object.freeze({
      id: input.id,
      ruleId: input.ruleId,
      pathPattern: input.pathPattern,
      reason: input.reason,
      createdAt: input.createdAt,
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    }),
  );
}

/** Pure — the clock is injected. A suppression without `expiresAt` never expires. */
export function isSuppressionExpired(current: Suppression, now: Timestamp): boolean {
  return current.expiresAt !== undefined && now >= current.expiresAt;
}
