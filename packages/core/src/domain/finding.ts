import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import { position, type Position } from "./position.js";
import type { Severity } from "./severity.js";
import { Validator } from "./validation.js";

/**
 * Raw output of a tool adapter, before triage turns it into a `Violation`.
 * Deliberately looser than `Violation`: the rule code is the tool's own
 * (unbranded), and severity is only present when the tool's scale maps
 * onto ours.
 */
export interface Finding {
  /** Identifier of the producing tool/adapter, e.g. `"jscpd"`. */
  readonly tool: string;
  /** The tool's own rule/check code, unbranded. */
  readonly externalRuleId: string;
  readonly message: string;
  readonly position: Position;
  readonly severity?: Severity;
  /** Tool-specific payload, opaque to the domain. */
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FindingInput {
  readonly tool: string;
  readonly externalRuleId: string;
  readonly message: string;
  readonly position: Position;
  readonly severity?: Severity;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function finding(input: FindingInput): Result<Finding, ValidationError> {
  const validator = new Validator("Finding");
  validator.nonBlankString("tool", input.tool);
  validator.nonBlankString("externalRuleId", input.externalRuleId);
  validator.nonBlankString("message", input.message);
  const validatedPosition = validator.embed("position", position(input.position), input.position);
  return validator.toResult(() =>
    Object.freeze({
      tool: input.tool,
      externalRuleId: input.externalRuleId,
      message: input.message,
      position: validatedPosition,
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      metadata: Object.freeze({ ...input.metadata }),
    }),
  );
}
