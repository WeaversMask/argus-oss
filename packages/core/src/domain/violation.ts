import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { ViolationId } from "./ids.js";
import type { LayerName } from "./layer.js";
import type { Position } from "./position.js";
import type { RuleId } from "./rule.js";
import type { Severity } from "./severity.js";
import { Validator } from "./validation.js";

/** A confirmed rule breach at a specific source position. */
export interface Violation {
  readonly id: ViolationId;
  readonly ruleId: RuleId;
  readonly severity: Severity;
  readonly message: string;
  readonly position: Position;
  /** Layer the offending file belongs to, when classified. */
  readonly layer?: LayerName;
}

export function violation(input: Violation): Result<Violation, ValidationError> {
  const validator = new Validator("Violation");
  validator.nonBlankString("message", input.message);
  return validator.toResult(() =>
    Object.freeze({
      id: input.id,
      ruleId: input.ruleId,
      severity: input.severity,
      message: input.message,
      position: input.position,
      ...(input.layer !== undefined ? { layer: input.layer } : {}),
    }),
  );
}
