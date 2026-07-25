import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import { position, type Position } from "./position.js";
import { Validator } from "./validation.js";

/** A mechanical edit that would resolve a violation: replace `position`'s span with `replacement`. */
export interface Fix {
  readonly position: Position;
  /** Text to splice in. Empty string is a valid pure deletion. */
  readonly replacement: string;
}

/** Smart constructor: validates a {@link Fix} and returns a frozen copy. */
export function fix(input: Fix): Result<Fix, ValidationError> {
  const validator = new Validator("Fix");
  const validatedPosition = validator.embed("position", position(input.position), input.position);
  return validator.toResult(() =>
    Object.freeze({
      position: validatedPosition,
      replacement: input.replacement,
    }),
  );
}
