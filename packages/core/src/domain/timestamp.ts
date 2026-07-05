import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { Brand } from "./brand.js";
import { Validator } from "./validation.js";

/**
 * An instant as integer milliseconds since the Unix epoch (UTC).
 *
 * The domain never reads clocks (`Date.now()` is a side effect) — callers
 * at the edges construct timestamps and inject them.
 */
export type Timestamp = Brand<number, "Timestamp">;

export function timestamp(epochMs: number): Result<Timestamp, ValidationError> {
  const validator = new Validator("Timestamp");
  validator.integerAtLeast("epochMs", epochMs, 0);
  return validator.toResult(() => epochMs as Timestamp);
}
